import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { HydratedDocument } from 'mongoose';
import DuesPayment, { type IDuesPayment } from '@/lib/models/DuesPayment';
import DuesCheckout from '@/lib/models/DuesCheckout';
import { HttpError } from '@/lib/community/server';
import { validDuesTransaction, type PaystackTransaction } from './policy';
import { paymentSettings } from './settings';
import { recordActivity } from '@/lib/utils/activity';

export async function ensureInvoice(memberId: string, year: number, quarter: number) {
  const { quarterlyDuesKobo } = await paymentSettings();
  await DuesPayment.init();
  try {
    return (await DuesPayment.findOneAndUpdate({ memberId, year, quarter }, { $setOnInsert: { amountKobo: quarterlyDuesKobo, status: 'Unpaid' } }, { upsert: true, new: true, runValidators: true }))!;
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    return (await DuesPayment.findOne({ memberId, year, quarter }))!;
  }
}
export async function initialiseDuesCheckout(invoice: HydratedDocument<IDuesPayment>, email: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new HttpError(503, 'Paystack is not configured. Please use bank transfer.');
  const reference = `DUES-${invoice._id}-${randomBytes(8).toString('hex')}`;
  await DuesCheckout.init();
  const checkout = await DuesCheckout.create({ invoiceId: invoice._id, memberId: invoice.memberId, reference, email, amountKobo: invoice.amountKobo });
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, amount: checkout.amountKobo, currency: 'NGN', reference, callback_url: `${appUrl}/members/payments/callback`,
      metadata: { paymentType: 'dues', invoiceId: invoice._id.toString(), memberId: invoice.memberId.toString() } }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json();
  if (!response.ok || !payload.status || !/^https:\/\//.test(payload.data?.authorization_url || '')) throw new HttpError(502, 'Paystack could not start checkout. Please try again.');
  await recordActivity({ action: 'Dues checkout started', details: `${invoice.year} Q${invoice.quarter}; NGN ${checkout.amountKobo / 100}`, actorEmail: email, actorId: invoice.memberId.toString(), targetId: invoice._id.toString() });
  return { reference, authorizationUrl: payload.data.authorization_url };
}
export async function confirmDuesTransaction(transaction: PaystackTransaction, memberId?: string) {
  const checkout = await DuesCheckout.findOne({ reference: transaction.reference });
  if (!checkout || (memberId && checkout.memberId.toString() !== memberId)) throw new HttpError(404, 'Payment reference not found for your account');
  if (checkout.status === 'Voided') throw new HttpError(400, 'This checkout was voided by an administrator correction');
  if (!validDuesTransaction(transaction, checkout)) throw new HttpError(400, 'Payment amount, currency or payer did not match the checkout');
  const date = transaction.paid_at && Number.isFinite(Date.parse(transaction.paid_at)) ? new Date(transaction.paid_at) : new Date();
  const invoice = await DuesPayment.findOneAndUpdate({ _id: checkout.invoiceId, status: { $ne: 'Paid' } }, {
    $set: { status: 'Paid', paymentMethod: 'paystack', paymentRef: checkout.reference, paidAt: date, adminNote: '' },
  }, { new: true });
  const existing = invoice || await DuesPayment.findById(checkout.invoiceId);
  if (!existing) throw new HttpError(404, 'Dues period not found');
  const duplicate = existing.paymentRef !== checkout.reference;
  await DuesCheckout.updateOne({ _id: checkout._id }, { $set: { status: duplicate ? 'Duplicate' : 'Paid', paidAt: date } });
  if (invoice) await recordActivity({ action: 'Paystack dues payment confirmed', details: `${existing.year} Q${existing.quarter}; NGN ${checkout.amountKobo / 100}; reference ${checkout.reference}`, actorEmail: checkout.email, actorId: checkout.memberId.toString(), targetId: existing._id.toString() });
  return { invoice: existing, duplicate, changed: !!invoice };
}
export function paymentError(error: unknown) {
  if ((error as { code?: number })?.code === 11000) return NextResponse.json({ error: 'This transfer reference has already been submitted' }, { status: 409 });
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  return null;
}
