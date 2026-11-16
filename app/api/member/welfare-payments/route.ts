import { NextRequest, NextResponse } from 'next/server';
import WelfareFund from '@/lib/models/WelfareFund';
import WelfarePayment from '@/lib/models/WelfarePayment';
import BankAccount from '@/lib/models/BankAccount';
import { requireCommunityMember, readJson, HttpError, routeError } from '@/lib/community/server';
import { visiblePaymentMembers } from '@/lib/payments/people';
import { welfareRequestSchema } from '@/lib/payments/policy';
import { ensureWelfareInvoice, initialiseWelfareCheckout, welfarePaymentDirectory } from '@/lib/payments/welfare';
import { paymentError } from '@/lib/payments/server';
import { recordActivity } from '@/lib/utils/activity';

export async function GET() {
  try {
    const member = await requireCommunityMember();
    const [people, funds, bankAccount] = await Promise.all([visiblePaymentMembers(), WelfareFund.find({}).sort({ createdAt: -1 }).lean(), BankAccount.findOne().sort({ updatedAt: -1 }).select('bankName accountName accountNumber').lean()]);
    const [invoices, own] = await Promise.all([WelfarePayment.find({ memberId: { $in: people.map(person => person.id) } }).select('memberId fundId amountKobo status').lean(), WelfarePayment.find({ memberId: member._id }).lean()]);
    return NextResponse.json({ success: true, bankAccount, funds: funds.map(fund => {
      const invoice = own.find(payment => payment.fundId.toString() === fund._id.toString());
      return { ...fund, ownPayment: invoice ? { _id: invoice._id, status: invoice.status, amountKobo: invoice.amountKobo, paymentMethod: invoice.paymentMethod, paidAt: invoice.paidAt, adminNote: invoice.adminNote, bankReference: invoice.bankReference } : { status: 'Unpaid', amountKobo: fund.amountKobo },
        directory: welfarePaymentDirectory(people, invoices.map(payment => ({ ...payment, memberId: payment.memberId.toString(), fundId: payment.fundId.toString() })), fund._id.toString(), fund.amountKobo) };
    }) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return routeError(error); }
}
export async function POST(request: NextRequest) {
  try {
    const member = await requireCommunityMember(), input = welfareRequestSchema.parse(await readJson(request));
    const fund = await WelfareFund.findOne({ _id: input.fundId, isActive: true });
    if (!fund) throw new HttpError(404, 'This welfare fund is not accepting payments');
    const invoice = await ensureWelfareInvoice(member._id.toString(), input.fundId, fund.amountKobo);
    if (invoice.status === 'Paid') throw new HttpError(409, 'You have already paid this welfare contribution');
    if (invoice.status === 'Pending') throw new HttpError(409, 'Your transfer is awaiting administrator confirmation');
    if (input.method === 'paystack') return NextResponse.json({ success: true, ...await initialiseWelfareCheckout(invoice, member.email) });
    if (!await BankAccount.exists({})) throw new HttpError(503, 'Bank transfer details have not been configured');
    const saved = await WelfarePayment.findOneAndUpdate({ _id: invoice._id, status: { $in: ['Unpaid', 'Rejected'] } }, { $set: {
      status: 'Pending', paymentMethod: 'bank', bankReference: input.bankReference, senderName: input.senderName,
      transferDate: new Date(`${input.transferDate}T00:00:00Z`), submittedAt: new Date(), adminNote: '',
    } }, { new: true, runValidators: true });
    if (!saved) throw new HttpError(409, 'This contribution changed. Refresh your payment record.');
    await recordActivity({ action: 'Bank welfare transfer submitted', details: `Fund ${input.fundId}; NGN ${saved.amountKobo / 100}; reference ${input.bankReference}`, actorEmail: member.email, actorId: member._id.toString(), targetId: saved._id.toString() });
    return NextResponse.json({ success: true, status: 'Pending', message: 'An administrator will confirm this transfer after checking the bank statement.' });
  } catch (error) { return paymentError(error) || routeError(error); }
}
