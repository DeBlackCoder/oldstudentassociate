import { NextRequest, NextResponse } from 'next/server';
import DuesPayment from '@/lib/models/DuesPayment';
import DuesCheckout from '@/lib/models/DuesCheckout';
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
      const input = paymentCorrectionSchema.parse(body);
      const result = await correctPayment(DuesPayment, DuesCheckout, id, admin._id, input);
      await logCommunityAction(admin, 'Corrected dues payment record', id, `${JSON.stringify(result.before)} -> ${JSON.stringify({ status: result.payment.status, amountKobo: result.payment.amountKobo })}; ${input.note}`);
      return NextResponse.json({ success: true, status: result.payment.status });
    }
    const input = bankReviewSchema.parse(body);
    const existing = await DuesPayment.findById(id);
    if (!existing) throw new HttpError(404, 'Dues payment not found');
    await assertVisiblePaymentMember(existing.memberId);
    const now = new Date();
    const invoice = await DuesPayment.findOneAndUpdate({ _id: id, status: 'Pending', paymentMethod: 'bank' }, { $set: {
      status: input.decision === 'approve' ? 'Paid' : 'Rejected', reviewedBy: admin._id, reviewedAt: now, adminNote: input.note,
      ...(input.decision === 'approve' ? { paidAt: now } : {}),
    } }, { new: true, runValidators: true });
    if (!invoice) throw new HttpError(409, 'Only a pending bank transfer can be reviewed. This payment may already have been processed.');
    await logCommunityAction(admin, input.decision === 'approve' ? 'Confirmed bank dues payment' : 'Rejected bank dues payment', id,
      `${invoice.year} Q${invoice.quarter}; NGN ${invoice.amountKobo / 100}; member ${invoice.memberId}; reference ${invoice.bankReference}; ${input.note}`);
    return NextResponse.json({ success: true, status: invoice.status });
  } catch (error) { return paymentError(error) || routeError(error); }
}
