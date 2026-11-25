import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Applicant from '@/lib/models/Applicant';
import { HttpError, assertId, logCommunityAction, readJson, requireCommunityAdmin, routeError } from '@/lib/community/server';
import { notifyPaymentClaimRejected } from '@/lib/payments/notifications';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireCommunityAdmin(true);
    const { id } = await params;
    assertId(id);
    const { remarks } = z.object({ remarks: z.string().trim().min(3).max(2000) }).strict().parse(await readJson(request));
    const now = new Date();
    const applicant = await Applicant.findOneAndUpdate({
      _id: id,
      paymentStatus: { $ne: 'paid' },
      paymentClaimStatus: 'pending',
    }, { $set: {
      paymentClaimStatus: 'rejected',
      paymentClaimRejectedAt: now,
      paymentClaimRejectedBy: admin._id,
      paymentClaimRejectionReason: remarks,
    } }, { new: true, runValidators: true });

    if (!applicant) throw new HttpError(409, 'This in-person payment report is no longer awaiting review.');

    await logCommunityAction(admin, 'Rejected in-person registration payment report', id, `Application ${applicant.applicationRef}; reason: ${remarks}`);
    const notificationSent = await notifyPaymentClaimRejected(applicant, remarks);
    return NextResponse.json({
      success: true,
      notificationSent,
      message: notificationSent
        ? 'Payment report rejected. The member has been notified by email.'
        : 'Payment report rejected, but the member email could not be sent. Please contact them directly.',
    });
  } catch (error) {
    return routeError(error);
  }
}
