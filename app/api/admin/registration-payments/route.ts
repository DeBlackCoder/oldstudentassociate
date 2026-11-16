import { NextResponse } from 'next/server';
import Applicant from '@/lib/models/Applicant';
import { visibleAccountFilter } from '@/lib/utils/account-visibility';
import { requireCommunityAdmin, routeError } from '@/lib/community/server';
import { registrationFeeKobo } from '@/lib/registration/policy';

export async function GET() {
  try {
    const admin = await requireCommunityAdmin();
    const payments = await Applicant.find({ ...visibleAccountFilter, paymentStatus: { $ne: 'paid' }, status: { $in: ['Saved', 'Pending'] } })
      .select('fullName email applicationRef paymentStatus paymentExpectedAmount savedAt paidAt').sort({ savedAt: -1, createdAt: -1 }).limit(1000).lean();
    return NextResponse.json({ success: true, canReview: admin.role !== 'Verifier', payments: payments.map(payment => ({ ...payment,
      paymentExpectedAmount: payment.paymentExpectedAmount || registrationFeeKobo(),
    })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return routeError(error); }
}
