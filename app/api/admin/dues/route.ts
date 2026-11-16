import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import DuesPayment, { type IDuesPayment } from '@/lib/models/DuesPayment';
import DuesCheckout from '@/lib/models/DuesCheckout';
import EventRegistration from '@/lib/models/EventRegistration';
import WelfarePayment from '@/lib/models/WelfarePayment';
import { requireCommunityAdmin, readJson, HttpError, routeError, logCommunityAction } from '@/lib/community/server';
import { hiddenAccountIds, privateActorProjection } from '@/lib/utils/account-visibility';
import { currentPeriod, DUES_START_YEAR, eligibleQuarters, manualPaymentSchema } from '@/lib/payments/policy';
import { paymentSettings } from '@/lib/payments/settings';
import { paymentDirectory } from '@/lib/payments/directory';
import { visiblePaymentMembers } from '@/lib/payments/people';
import { ensureInvoice, paymentError } from '@/lib/payments/server';
import { assertVisiblePaymentMember } from '@/lib/payments/admin';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireCommunityAdmin(), period = currentPeriod();
    const year = Number(request.nextUrl.searchParams.get('year') || period.year);
    if (!Number.isInteger(year) || year < DUES_START_YEAR || year > period.year) throw new HttpError(400, 'Choose an available dues year');
    const status = request.nextUrl.searchParams.get('status');
    if (status && !['Pending', 'Paid', 'Rejected', 'Unpaid'].includes(status)) throw new HttpError(400, 'Invalid payment status');
    const [people, settings, hidden] = await Promise.all([visiblePaymentMembers(), paymentSettings(), hiddenAccountIds()]);
    const memberIds = people.map(person => person.id);
    const [invoices, duplicates, events, welfare] = await Promise.all([
      DuesPayment.find({ memberId: { $in: memberIds } }).sort({ submittedAt: -1, updatedAt: -1 }).lean(),
      DuesCheckout.find({ status: 'Duplicate', memberId: { $in: memberIds } }).select('reference invoiceId memberId amountKobo paidAt').lean(),
      EventRegistration.find({ paymentStatus: 'paid', memberId: { $in: memberIds } }).select('memberId').lean(),
      WelfarePayment.find({ status: 'Paid', memberId: { $in: memberIds } }).select('memberId').lean(),
    ]);
    const peopleById = new Map(people.map(person => [person.id, person]));
    const directory = paymentDirectory(people, invoices.map(invoice => ({ ...invoice, memberId: invoice.memberId.toString() })), events.map(event => ({ memberId: event.memberId.toString() })), year).map(person => {
      const member = peopleById.get(person.id)!;
      const welfarePaymentCount = welfare.filter(payment => payment.memberId.toString() === person.id).length;
      return { ...person, email: member.email, welfarePaymentCount, totalPaymentCount: person.totalPaymentCount + welfarePaymentCount,
        periods: eligibleQuarters(year, member.createdAt).map(quarter => {
          const invoice = invoices.find(payment => payment.memberId.toString() === person.id && payment.year === year && payment.quarter === quarter);
          return { _id: invoice?._id, year, quarter, status: invoice?.status || 'Unpaid', amountKobo: invoice?.amountKobo || settings.quarterlyDuesKobo };
        }) };
    });
    const dues = invoices.filter(invoice => !status || invoice.status === status as IDuesPayment['status']).map(invoice => {
      const person = peopleById.get(invoice.memberId.toString())!;
      return { ...privateActorProjection(invoice, hidden.adminIds), memberName: person.fullName, memberEmail: person.email };
    });
    return NextResponse.json({ success: true, canReview: admin.role !== 'Verifier', dues, duplicates, directory, members: people.map(({ id, fullName, email }) => ({ id, fullName, email })),
      year, currentQuarter: period.quarter, amountKobo: settings.quarterlyDuesKobo, availableYears: Array.from({ length: period.year - DUES_START_YEAR + 1 }, (_, i) => period.year - i) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return routeError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const admin = await requireCommunityAdmin(true);
    const input = manualPaymentSchema.extend({ year: z.number().int().min(DUES_START_YEAR).max(2100), quarter: z.number().int().min(1).max(4) }).parse(await readJson(request));
    const member = await assertVisiblePaymentMember(input.memberId);
    if (!eligibleQuarters(input.year, member.createdAt).includes(input.quarter)) throw new HttpError(400, 'This quarter is not due for this member');
    const invoice = await ensureInvoice(input.memberId, input.year, input.quarter);
    if (invoice.status === 'Paid') throw new HttpError(409, 'This quarter is already paid');
    const now = new Date();
    const saved = await DuesPayment.findOneAndUpdate({ _id: invoice._id, status: { $ne: 'Paid' } }, { $set: { status: 'Paid', paymentMethod: 'bank',
      bankReference: input.bankReference, senderName: member.fullName || '', paidAt: now, submittedAt: invoice.submittedAt || now, reviewedBy: admin._id, reviewedAt: now, adminNote: input.note } }, { new: true, runValidators: true });
    if (!saved) throw new HttpError(409, 'This payment was already confirmed');
    await logCommunityAction(admin, 'Recorded bank dues payment', saved._id.toString(), `Member ${input.memberId}; ${input.year} Q${input.quarter}; NGN ${saved.amountKobo / 100}; reference ${input.bankReference}; ${input.note}`);
    return NextResponse.json({ success: true, status: 'Paid' });
  } catch (error) { return paymentError(error) || routeError(error); }
}
