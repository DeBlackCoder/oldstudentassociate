import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Member from '@/lib/models/Member';
import Applicant from '@/lib/models/Applicant';
import { getMemberSession } from '@/lib/utils/member-auth';
import { getAccountAdmin } from '@/lib/utils/admin-member';
import { applicationStatusForMember, registrationFeeKobo } from '@/lib/registration/policy';
import { isHiddenAccount } from '@/lib/utils/account-visibility';

export async function GET() {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    await connectDB();

    const member = await Member.findById(session.memberId);
    if (!member || member.isDeleted) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const admin = await getAccountAdmin(member);
    let applicantData = null;
    if (member.applicantId) {
      applicantData = await Applicant.findById(member.applicantId)
        .select('fullName status paymentStatus paymentClaimStatus paymentClaimRejectionReason membershipNumber applicationRef secondarySchool graduationYear submittedAt paidAt');
    }

    return NextResponse.json({
      success: true,
      member: {
        id: member._id.toString(),
        email: member.email,
        profileComplete: member.profileComplete,
        fullName: member.fullName || applicantData?.fullName || admin?.fullName,
        canAccessAdminPanel: Boolean(admin),
        adminRole: admin?.role,
        status: applicationStatusForMember(applicantData) || 'Saved',
        applicationStatus: applicationStatusForMember(applicantData),
        registrationFeeKobo: registrationFeeKobo(),
        registrationFeeApproved: isHiddenAccount(member.email) && member.registrationFeeApproved === true,
        registrationPreApproved: isHiddenAccount(member.email) && member.registrationPreApproved === true,
        paymentStatus: applicantData?.paymentStatus || 'unpaid',
        paymentClaimStatus: applicantData?.paymentClaimStatus,
        paymentClaimRejectionReason: applicantData?.paymentClaimRejectionReason,
        membershipNumber: applicantData?.membershipNumber,
        applicationRef: member.applicationRef || applicantData?.applicationRef,
        secondarySchool: applicantData?.secondarySchool,
        graduationYear: applicantData?.graduationYear,
        submittedAt: applicantData?.submittedAt,
        paidAt: applicantData?.paidAt,
      },
    });
  } catch (error) {
    console.error('Member me error:', error);
    return NextResponse.json({ error: 'Failed to fetch account.' }, { status: 500 });
  }
}
