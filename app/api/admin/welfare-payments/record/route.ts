import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import WelfareFund from '@/lib/models/WelfareFund';
import WelfarePayment from '@/lib/models/WelfarePayment';
import { requireCommunityAdmin, readJson, HttpError, routeError, logCommunityAction } from '@/lib/community/server';
import { manualPaymentSchema } from '@/lib/payments/policy';
import { assertVisiblePaymentMember } from '@/lib/payments/admin';
import { ensureWelfareInvoice } from '@/lib/payments/welfare';
import { paymentError } from '@/lib/payments/server';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireCommunityAdmin(true);
    const input = manualPaymentSchema.extend({ fundId: z.string().regex(/^[a-f\d]{24}$/i) }).parse(await readJson(request));
    const member = await assertVisiblePaymentMember(input.memberId), fund = await WelfareFund.findById(input.fundId);
    if (!fund) throw new HttpError(404, 'Welfare fund not found');
    const invoice = await ensureWelfareInvoice(input.memberId, input.fundId, fund.amountKobo);
    if (invoice.status === 'Paid') throw new HttpError(409, 'This welfare contribution is already paid');
    const now = new Date();
    const payment = await WelfarePayment.findOneAndUpdate({ _id: invoice._id, status: { $ne: 'Paid' } }, { $set: { status: 'Paid', paymentMethod: 'bank',
      bankReference: input.bankReference, senderName: member.fullName || '', paidAt: now, submittedAt: invoice.submittedAt || now, reviewedBy: admin._id, reviewedAt: now, adminNote: input.note } }, { new: true, runValidators: true });
    if (!payment) throw new HttpError(409, 'This contribution was already confirmed');
    await logCommunityAction(admin, 'Recorded bank welfare payment', payment._id.toString(), `Member ${input.memberId}; fund ${input.fundId}; NGN ${payment.amountKobo / 100}; reference ${input.bankReference}; ${input.note}`);
    return NextResponse.json({ success: true, status: 'Paid' });
  } catch (error) { return paymentError(error) || routeError(error); }
}
