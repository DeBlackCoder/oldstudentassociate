import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';
import { validateMembershipNumber } from '@/lib/utils/reference-generator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const membershipNumber = searchParams.get('number');

    if (!membershipNumber) {
      return NextResponse.json(
        { error: 'Membership number is required' },
        { status: 400 }
      );
    }

    // Validate format
    if (!validateMembershipNumber(membershipNumber)) {
      return NextResponse.json(
        { error: 'Invalid membership number format' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find approved member
    const member = await Applicant.findOne({
      membershipNumber,
      status: 'Approved'
    }).select('fullName secondarySchool graduationYear membershipNumber status');

    if (!member) {
      return NextResponse.json(
        { error: 'No approved member found with this membership number' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      member: {
        fullName: member.fullName,
        secondarySchool: member.secondarySchool,
        graduationYear: member.graduationYear,
        membershipNumber: member.membershipNumber,
        status: member.status
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}
