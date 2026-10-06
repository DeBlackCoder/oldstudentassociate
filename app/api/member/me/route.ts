import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Member from '@/lib/models/Member';
import Applicant from '@/lib/models/Applicant';
import { getMemberSession } from '@/lib/utils/member-auth';

export async function GET() {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    await connectDB();

    const member = await Member.findById(session.memberId);
    if (!member) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    let applicantData = null;
    if (member.applicantId) {
      applicantData = await Applicant.findById(member.applicantId)
        .select('fullName status paymentStatus membershipNumber applicationRef secondarySchool graduationYear submittedAt paidAt');
    }

    return NextResponse.json({
      success: true,
      member: {
        id: member._id.toString(),
        email: member.email,
        profileComplete: member.profileComplete,
        fullName: member.fullName || applicantData?.fullName,
        status: applicantData?.status || 'Pending',
        paymentStatus: applicantData?.paymentStatus || 'unpaid',
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
