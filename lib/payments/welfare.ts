import { randomBytes } from 'node:crypto';
import type { HydratedDocument } from 'mongoose';
import WelfarePayment, { type IWelfarePayment } from '@/lib/models/WelfarePayment';
import WelfareCheckout from '@/lib/models/WelfareCheckout';
import { HttpError } from '@/lib/community/server';
import { validDuesTransaction, type PaystackTransaction } from './policy';
import { recordActivity } from '@/lib/utils/activity';

export async function ensureWelfareInvoice(memberId: string, fundId: string, amountKobo: number) {
  await WelfarePayment.init();
  try {
    return (await WelfarePayment.findOneAndUpdate({ memberId, fundId }, { $setOnInsert: { amountKobo, status: 'Unpaid' } }, { upsert: true, new: true, runValidators: true }))!;
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    return (await WelfarePayment.findOne({ memberId, fundId }))!;
  }
}
export async function initialiseWelfareCheckout(invoice: HydratedDocument<IWelfarePayment>, email: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new HttpError(503, 'Paystack is not configured. Please use bank transfer.');
  const reference = `WELFARE-${invoice._id}-${randomBytes(8).toString('hex')}`;
  await WelfareCheckout.init();
  const checkout = await WelfareCheckout.create({ invoiceId: invoice._id, memberId: invoice.memberId, reference, email, amountKobo: invoice.amountKobo });
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, amount: checkout.amountKobo, currency: 'NGN', reference, callback_url: `${appUrl}/members/payments/callback`,
      metadata: { paymentType: 'welfare', invoiceId: invoice._id.toString(), memberId: invoice.memberId.toString() } }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json();
  if (!response.ok || !payload.status || !/^https:\/\//.test(payload.data?.authorization_url || '')) throw new HttpError(502, 'Paystack could not start checkout. Please try again.');
  await recordActivity({ action: 'Welfare checkout started', details: `Fund ${invoice.fundId}; NGN ${checkout.amountKobo / 100}`, actorEmail: email, actorId: invoice.memberId.toString(), targetId: invoice._id.toString() });
  return { reference, authorizationUrl: payload.data.authorization_url };
}
export async function confirmWelfareTransaction(transaction: PaystackTransaction, memberId?: string) {
  const checkout = await WelfareCheckout.findOne({ reference: transaction.reference });
  if (!checkout || (memberId && checkout.memberId.toString() !== memberId)) throw new HttpError(404, 'Payment reference not found for your account');
  if (checkout.status === 'Voided') throw new HttpError(400, 'This checkout was voided by an administrator correction');
  if (!validDuesTransaction(transaction, checkout)) throw new HttpError(400, 'Payment amount, currency or payer did not match the checkout');
  const paidAt = transaction.paid_at && Number.isFinite(Date.parse(transaction.paid_at)) ? new Date(transaction.paid_at) : new Date();
  const invoice = await WelfarePayment.findOneAndUpdate({ _id: checkout.invoiceId, status: { $ne: 'Paid' } }, {
    $set: { status: 'Paid', paymentMethod: 'paystack', paymentRef: checkout.reference, paidAt, adminNote: '' },
  }, { new: true });
  const existing = invoice || await WelfarePayment.findById(checkout.invoiceId);
  if (!existing) throw new HttpError(404, 'Welfare contribution not found');
  const duplicate = existing.paymentRef !== checkout.reference;
  await WelfareCheckout.updateOne({ _id: checkout._id }, { $set: { status: duplicate ? 'Duplicate' : 'Paid', paidAt } });
  if (invoice) await recordActivity({ action: 'Paystack welfare payment confirmed', details: `Fund ${existing.fundId}; NGN ${checkout.amountKobo / 100}; reference ${checkout.reference}`, actorEmail: checkout.email, actorId: checkout.memberId.toString(), targetId: existing._id.toString() });
  return { invoice: existing, duplicate, changed: !!invoice };
}
export function welfarePaymentDirectory(people: { id: string; fullName: string; membershipNumber?: string }[], invoices: { memberId: string; fundId: string; amountKobo: number; status: string }[], fundId: string, amountKobo: number) {
  return people.map(person => {
    const all = invoices.filter(invoice => invoice.memberId === person.id);
    const current = all.find(invoice => invoice.fundId === fundId);
    const paid = all.filter(invoice => invoice.status === 'Paid');
    return { id: person.id, fullName: person.fullName, membershipNumber: person.membershipNumber,
      status: current?.status || 'Unpaid', amountKobo: current?.amountKobo || amountKobo,
      welfarePaymentCount: paid.length, totalAmountKobo: paid.reduce((total, invoice) => total + invoice.amountKobo, 0) };
  });
}
