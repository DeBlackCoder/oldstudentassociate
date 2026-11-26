import { NextRequest, NextResponse } from 'next/server';
import Applicant from '@/lib/models/Applicant';
import { z } from 'zod';
import { requireCommunityAdmin, readJson, assertId, HttpError, routeError, logCommunityAction } from '@/lib/community/server';
import { submissionFieldsOnPayment, registrationFeeKobo } from '@/lib/registration/policy';
import { notifyMembershipPayment } from '@/lib/payments/notifications';
import { isHiddenAccount } from '@/lib/utils/account-visibility';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireCommunityAdmin(true), { id } = await params;
    assertId(id);
    const { remarks } = z.object({ remarks: z.string().trim().max(2000).optional() }).strict().parse(await readJson(request));
    const application = await Applicant.findById(id);
    if (!application || isHiddenAccount(application.email)) throw new HttpError(404, 'Saved registration form not found');
    if (application.paymentStatus === 'paid') throw new HttpError(409, 'Registration payment is already confirmed');
    const now = new Date();
    const physicalPaymentClaim = application.paymentClaimStatus === 'pending';
    const paymentMethod = physicalPaymentClaim ? 'admin' : 'bank';
    const paymentReference = physicalPaymentClaim
      ? `CASH-ADMIN-CONFIRMED-${application._id}-${now.getTime()}`
      : `BANK-TRANSFER-${application._id}-${now.getTime()}`;
    const updated = await Applicant.findOneAndUpdate({
      _id: application._id,
      paymentStatus: { $ne: 'paid' },
      paymentClaimStatus: physicalPaymentClaim ? 'pending' : { $ne: 'pending' },
    }, { $set: {
      ...submissionFieldsOnPayment(application, now), paymentStatus: 'paid', paymentMethod,
      paymentRef: paymentReference, paymentAmount: application.paymentExpectedAmount || registrationFeeKobo(), paidAt: now,
      ...(physicalPaymentClaim ? { paymentClaimStatus: 'confirmed', paymentClaimConfirmedAt: now, paymentClaimConfirmedBy: admin._id } : {}),
      ...(remarks ? { adminRemarks: remarks } : {}),
    }, ...(physicalPaymentClaim ? {} : { $unset: {
      paymentClaimStatus: '', paymentClaimedAt: '', paymentClaimConfirmedAt: '', paymentClaimConfirmedBy: '',
      paymentClaimRejectedAt: '', paymentClaimRejectedBy: '', paymentClaimRejectionReason: '',
    } }) }, { new: true, runValidators: true });
    if (!updated) throw new HttpError(409, 'This registration payment has already been confirmed');
    await logCommunityAction(admin, physicalPaymentClaim ? 'Confirmed in-person registration payment' : 'Confirmed registration bank transfer', id, `Reference ${updated.applicationRef}; NGN ${(updated.paymentAmount || 0) / 100}; saved form submitted automatically. ${remarks || ''}`);
    const notificationSent = await notifyMembershipPayment(updated);
    const paymentMessage = physicalPaymentClaim
      ? 'In-person payment confirmed. The saved form has been submitted automatically for review.'
      : 'Registration payment confirmed. The saved form has been submitted automatically for review.';
    return NextResponse.json({
      success: true,
      message: notificationSent
        ? `${paymentMessage} The member has been notified by email.`
        : `${paymentMessage} The member email could not be sent; please contact them directly.`,
      notificationSent,
    });
  } catch (error) { return routeError(error); }
}
