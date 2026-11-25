import { NextResponse } from 'next/server';
import Applicant from '@/lib/models/Applicant';
import { requireCommunityMember, routeError, HttpError } from '@/lib/community/server';

export async function GET() {
  try {
    const member = await requireCommunityMember();
    const applicant = member.applicantId ? await Applicant.findById(member.applicantId) : null;
    if (!applicant || applicant.memberId?.toString() !== member._id.toString() || applicant.email !== member.email) {
      throw new HttpError(404, 'Save your registration form before choosing a payment option.');
    }

    return NextResponse.json({
      success: true,
      applicationRef: applicant.applicationRef,
      paymentStatus: applicant.paymentStatus,
      paymentClaimStatus: applicant.paymentClaimStatus || null,
      paymentClaimRejectionReason: applicant.paymentClaimRejectionReason,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST() {
  try {
    const member = await requireCommunityMember();
    const applicant = member.applicantId ? await Applicant.findById(member.applicantId) : null;
    if (!applicant || applicant.memberId?.toString() !== member._id.toString() || applicant.email !== member.email) {
      throw new HttpError(404, 'Save your registration form before reporting a payment.');
    }
    if (applicant.paymentStatus === 'paid') {
      return NextResponse.json({ success: true, paymentStatus: 'paid', paymentClaimStatus: applicant.paymentClaimStatus || null });
    }

    const claimedAt = new Date();
    const updated = await Applicant.findOneAndUpdate({
      _id: applicant._id,
      memberId: member._id,
      email: member.email,
      paymentStatus: { $ne: 'paid' },
      paymentClaimStatus: { $ne: 'pending' },
    }, {
      $set: {
        paymentClaimStatus: 'pending',
        paymentClaimedAt: claimedAt,
        status: 'Pending',
        submittedAt: applicant.submittedAt || claimedAt,
      },
      $unset: {
        paymentClaimConfirmedAt: '', paymentClaimConfirmedBy: '',
        paymentClaimRejectedAt: '', paymentClaimRejectedBy: '', paymentClaimRejectionReason: '',
      },
    }, { new: true, runValidators: true });

    if (!updated) {
      const current = await Applicant.findOne({ _id: applicant._id, memberId: member._id, email: member.email });
      if (!current) throw new HttpError(404, 'Your saved registration form could not be found.');
      if (current.paymentStatus === 'paid') {
        return NextResponse.json({ success: true, paymentStatus: 'paid', paymentClaimStatus: current.paymentClaimStatus || null });
      }
      if (current.paymentClaimStatus === 'pending') {
        return NextResponse.json({ success: true, paymentStatus: 'unpaid', paymentClaimStatus: 'pending' });
      }
      throw new HttpError(409, 'Your payment choice could not be saved. Please try again.');
    }

    return NextResponse.json({ success: true, paymentStatus: updated.paymentStatus, paymentClaimStatus: updated.paymentClaimStatus });
  } catch (error) {
    return routeError(error);
  }
}
