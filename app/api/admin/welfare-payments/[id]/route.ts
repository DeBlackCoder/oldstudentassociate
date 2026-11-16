import { NextRequest, NextResponse } from 'next/server';
import WelfarePayment from '@/lib/models/WelfarePayment';
import WelfareCheckout from '@/lib/models/WelfareCheckout';
import { requireCommunityAdmin, readJson, assertId, HttpError, routeError, logCommunityAction } from '@/lib/community/server';
import { bankReviewSchema, paymentCorrectionSchema } from '@/lib/payments/policy';
import { assertVisiblePaymentMember, correctPayment } from '@/lib/payments/admin';
import { paymentError } from '@/lib/payments/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireCommunityAdmin(true), { id } = await params;
    assertId(id);
    const body = await readJson(request);
    if (body?.operation === 'correct') {
      const input = paymentCorrectionSchema.parse(body), result = await correctPayment(WelfarePayment, WelfareCheckout, id, admin._id, input);
      await logCommunityAction(admin, 'Corrected welfare payment record', id, `${JSON.stringify(result.before)} -> ${JSON.stringify({ status: result.payment.status, amountKobo: result.payment.amountKobo })}; ${input.note}`);
      return NextResponse.json({ success: true, status: result.payment.status });
    }
    const input = bankReviewSchema.parse(body), existing = await WelfarePayment.findById(id);
    if (!existing) throw new HttpError(404, 'Welfare payment not found');
    await assertVisiblePaymentMember(existing.memberId);
    const now = new Date();
    const payment = await WelfarePayment.findOneAndUpdate({ _id: id, status: 'Pending', paymentMethod: 'bank' }, { $set: {
      status: input.decision === 'approve' ? 'Paid' : 'Rejected', reviewedBy: admin._id, reviewedAt: now, adminNote: input.note,
      ...(input.decision === 'approve' ? { paidAt: now } : {}),
    } }, { new: true, runValidators: true });
    if (!payment) throw new HttpError(409, 'Only a pending bank transfer can be reviewed. This payment may already have been processed.');
    await logCommunityAction(admin, input.decision === 'approve' ? 'Confirmed bank welfare payment' : 'Rejected bank welfare payment', id,
      `Fund ${payment.fundId}; NGN ${payment.amountKobo / 100}; member ${payment.memberId}; reference ${payment.bankReference}; ${input.note}`);
    return NextResponse.json({ success: true, status: payment.status });
  } catch (error) { return paymentError(error) || routeError(error); }
}
