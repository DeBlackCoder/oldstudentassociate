import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';
import { isHiddenAccount } from '@/lib/utils/account-visibility';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationRef, email } = body;

    if (!applicationRef || !email) {
      return NextResponse.json(
        { error: 'applicationRef and email are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const applicant = await Applicant.findOne({
      applicationRef: String(applicationRef),
      email: String(email).toLowerCase(),
    }).select(
      'applicationRef fullName email status membershipNumber paymentStatus paymentRef paidAt secondarySchool graduationYear submittedAt'
    );

    if (!applicant || isHiddenAccount(applicant.email)) {
      return NextResponse.json(
        { error: 'No record found with the provided application reference and email.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      member: {
        fullName: applicant.fullName,
        email: applicant.email,
        applicationRef: applicant.applicationRef,
        status: applicant.status,
        paymentStatus: applicant.paymentStatus || 'unpaid',
        membershipNumber: applicant.membershipNumber,
        secondarySchool: applicant.secondarySchool,
        graduationYear: applicant.graduationYear,
        submittedAt: applicant.submittedAt,
        paidAt: applicant.paidAt,
      },
    });
  } catch (error) {
    console.error('Member login check error:', error);
    return NextResponse.json({ error: 'Failed to check application status' }, { status: 500 });
  }
}
