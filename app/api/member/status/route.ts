import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';
import { visibleAccountFilter } from '@/lib/utils/account-visibility';

export async function GET(request: NextRequest) {
  try {
    const ref = request.nextUrl.searchParams.get('ref');

    if (!ref) {
      return NextResponse.json({ error: 'ref query parameter is required' }, { status: 400 });
    }

    await connectDB();

    const applicant = await Applicant.findOne({ ...visibleAccountFilter, applicationRef: ref }).select(
      'applicationRef fullName email status submittedAt membershipNumber paymentStatus'
    );

    if (!applicant || applicant.status === 'Saved' || applicant.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'No record found for the provided application reference' },
        { status: 404 }
      );
    }

    const response: {
      success: true;
      status: string;
      applicationRef: string;
      fullName: string;
      email: string;
      paymentStatus: string;
      submittedAt?: Date;
      membershipNumber?: string;
    } = {
      success: true,
      status: applicant.status,
      applicationRef: applicant.applicationRef,
      fullName: applicant.fullName,
      email: applicant.email,
      paymentStatus: applicant.paymentStatus,
      submittedAt: applicant.submittedAt,
    };

    if (applicant.membershipNumber) {
      response.membershipNumber = applicant.membershipNumber;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Member status fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch member status' }, { status: 500 });
  }
}
