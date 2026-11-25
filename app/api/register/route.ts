import { NextRequest, NextResponse } from 'next/server';
import { completeRegistrationSchema } from '@/lib/validations/registration';
import { requireCommunityMember, readJson, routeError } from '@/lib/community/server';
import { saveRegistration } from '@/lib/registration/server';
import { applicationStatusForMember } from '@/lib/registration/policy';

export async function POST(request: NextRequest) {
  try {
    const member = await requireCommunityMember();
    const data = completeRegistrationSchema.parse(await readJson(request));
    const applicant = await saveRegistration(member, data);
    const status = applicationStatusForMember(applicant);
    const submitted = status !== 'Saved';
    const message = applicant.paymentClaimStatus === 'pending'
      ? 'Form details updated. Your application remains submitted while payment verification is pending.'
      : submitted
        ? 'Form details updated. Your payment and review status are unchanged.'
        : 'Form saved. It will submit when your membership registration payment is confirmed.';
    return NextResponse.json({ success: true, status, paymentStatus: applicant.paymentStatus, submitted,
      message,
      applicationRef: applicant.applicationRef, applicantId: applicant._id,
    });
  } catch (error) { return routeError(error); }
}
