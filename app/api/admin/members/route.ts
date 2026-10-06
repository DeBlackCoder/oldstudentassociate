import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const members = await Applicant.find({ status: 'Approved' })
      .sort({ verifiedAt: -1 })
      .select('membershipNumber fullName email secondarySchool graduationYear verifiedAt');

    return NextResponse.json({
      success: true,
      members
    });
  } catch (error) {
    console.error('Members fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
