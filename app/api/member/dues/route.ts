import { NextRequest, NextResponse } from 'next/server';
import Member from '@/lib/models/Member';
import Applicant from '@/lib/models/Applicant';
import DuesPayment from '@/lib/models/DuesPayment';
import EventRegistration from '@/lib/models/EventRegistration';
import CommunityContent from '@/lib/models/CommunityContent';
import BankAccount from '@/lib/models/BankAccount';
import type { WelfareDetails } from '@/lib/community/types';
import { requireCommunityMember, readJson, HttpError, routeError } from '@/lib/community/server';
import { currentPeriod, eligibleQuarters, duesRequestSchema, DUES_START_YEAR } from '@/lib/payments/policy';
import { paymentDirectory, welfareDirectory, type DirectoryMember } from '@/lib/payments/directory';
import { ensureInvoice, initialiseDuesCheckout, paymentError } from '@/lib/payments/server';
import { paymentSettings } from '@/lib/payments/settings';
import { hiddenAccountIds, visibleAccountFilter } from '@/lib/utils/account-visibility';
import WelfarePayment from '@/lib/models/WelfarePayment';
import { recordActivity } from '@/lib/utils/activity';

export async function GET(request: NextRequest) {
  try {
    const member = await requireCommunityMember();
    const current = currentPeriod();
    const year = Number(request.nextUrl.searchParams.get('year') || current.year);
    if (!Number.isInteger(year) || year < DUES_START_YEAR || year > current.year) throw new HttpError(400, 'Choose an available dues year');
    const quarters = eligibleQuarters(year, member.createdAt);
    const settings = await paymentSettings(), hidden = await hiddenAccountIds();
    const members = await Member.find({ emailVerified: true, ...visibleAccountFilter }).select('fullName applicantId createdAt').lean();
    const results = await Promise.all([
      Applicant.find({ ...visibleAccountFilter, _id: { $in: members.map(m => m.applicantId).filter(Boolean) } }).select('fullName membershipNumber secondarySchool paymentStatus').lean(),
      DuesPayment.find({ memberId: { $in: members.map(m => m._id) } }).select('memberId year quarter status').lean(),
      EventRegistration.find({ paymentStatus: 'paid', memberId: { $in: members.map(m => m._id) } }).select('memberId').lean(),
      CommunityContent.find({ kind: 'welfare', status: 'Published' }).select('details').lean(),
      BankAccount.findOne().sort({ updatedAt: -1 }).select('bankName accountName accountNumber').lean(),
      DuesPayment.find({ memberId: member._id, year }).lean(),
      WelfarePayment.find({ status: 'Paid', memberId: { $in: members.map(m => m._id) } }).select('memberId').lean(),
    ]);
    const [applicants, invoices, events, welfare, bankAccount, own, welfarePayments] = results;
    const profiles = new Map(applicants.map(a => [a._id.toString(), a]));
    const people: DirectoryMember[] = members.map(m => {
      const applicant = m.applicantId ? profiles.get(m.applicantId.toString()) : undefined;
      return { id: m._id.toString(), fullName: applicant?.fullName || m.fullName || 'Name not supplied', membershipNumber: applicant?.membershipNumber,
        secondarySchool: applicant?.secondarySchool, createdAt: m.createdAt, registrationPaid: applicant?.paymentStatus === 'paid' };
    });
    const dues = quarters.map(quarter => own.find(invoice => invoice.quarter === quarter) || { _id: `${year}-${quarter}`, year, quarter, amountKobo: settings.quarterlyDuesKobo, status: 'Unpaid' });
    // Own transfer details are private; directory exposes names, period status and counts only.
    const ownView = dues.map(invoice => ({ _id: invoice._id, year: invoice.year, quarter: invoice.quarter, amountKobo: invoice.amountKobo, status: invoice.status,
      ...('paymentMethod' in invoice ? { paymentMethod: invoice.paymentMethod, paidAt: invoice.paidAt, adminNote: invoice.adminNote, bankReference: invoice.bankReference } : {}) }));
    const hiddenNames = new Set(hidden.names.map(name => name.trim().toLowerCase().replace(/\s+/g, ' ')));
    const safeWelfare = welfare.map(w => {
      const details = w.details as WelfareDetails;
      const safePerson = (person: WelfareDetails['donors'][number]) => !hidden.membershipNumbers.includes(person.membershipNumber || '') && !hiddenNames.has(person.name.trim().toLowerCase().replace(/\s+/g, ' '));
      return { ...details, donors: details.donors.filter(safePerson), beneficiaries: details.beneficiaries.filter(safePerson) };
    });
    const directory = paymentDirectory(people, invoices.map(i => ({ ...i, memberId: i.memberId.toString() })), events.map(e => ({ memberId: e.memberId.toString() })), year).map(person => {
      const welfarePaymentCount = welfarePayments.filter(payment => payment.memberId.toString() === person.id).length;
      return { ...person, welfarePaymentCount, totalPaymentCount: person.totalPaymentCount + welfarePaymentCount };
    });
    return NextResponse.json({ success: true, amountKobo: settings.quarterlyDuesKobo, annualAmountKobo: settings.quarterlyDuesKobo * 4, year,
      currentQuarter: current.quarter, availableYears: Array.from({ length: current.year - DUES_START_YEAR + 1 }, (_, i) => current.year - i), dues: ownView,
      directory, welfare: welfareDirectory(people, safeWelfare), bankAccount,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return paymentError(error) || routeError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const member = await requireCommunityMember();
    const input = duesRequestSchema.parse(await readJson(request));
    if (!eligibleQuarters(input.year, member.createdAt).includes(input.quarter)) throw new HttpError(400, 'This quarter is not due for your account');
    const invoice = await ensureInvoice(member._id.toString(), input.year, input.quarter);
    if (invoice.status === 'Paid') throw new HttpError(409, 'This quarter has already been paid');
    if (invoice.status === 'Pending') throw new HttpError(409, 'Your transfer is awaiting admin review. Please wait for a decision before paying again.');
    if (input.method === 'paystack') return NextResponse.json({ success: true, ...await initialiseDuesCheckout(invoice, member.email) });
    if (!await BankAccount.exists({})) throw new HttpError(503, 'Bank transfer details have not been configured by the administrator');
    const saved = await DuesPayment.findOneAndUpdate({ _id: invoice._id, status: { $in: ['Unpaid', 'Rejected'] } }, { $set: {
      status: 'Pending', paymentMethod: 'bank', bankReference: input.bankReference, senderName: input.senderName,
      transferDate: new Date(`${input.transferDate}T00:00:00Z`), submittedAt: new Date(), adminNote: '',
    } }, { new: true, runValidators: true });
    if (!saved) throw new HttpError(409, 'This quarter has changed. Refresh your payment record.');
    await recordActivity({ action: 'Bank dues transfer submitted', details: `${input.year} Q${input.quarter}; NGN ${saved.amountKobo / 100}; reference ${input.bankReference}`, actorEmail: member.email, actorId: member._id.toString(), targetId: saved._id.toString() });
    return NextResponse.json({ success: true, status: 'Pending', message: 'Transfer submitted. An administrator will confirm it after checking the bank statement.' });
  } catch (error) { return paymentError(error) || routeError(error); }
}
