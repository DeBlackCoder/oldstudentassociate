import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';
import { visibleAccountFilter } from '@/lib/utils/account-visibility';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await connectDB();

    const members = await Applicant.find({
      ...visibleAccountFilter,
      status: 'Approved',
      membershipNumber: { $exists: true, $nin: [null, ''] },
    })
      .sort({ verifiedAt: -1, fullName: 1 })
      .select('_id fullName email membershipNumber secondarySchool graduationYear verifiedAt');

    return NextResponse.json({
      success: true,
      members: members.map(member => ({
        id: member._id.toString(),
        fullName: member.fullName,
        email: member.email,
        membershipNumber: member.membershipNumber,
        secondarySchool: member.secondarySchool,
        graduationYear: member.graduationYear,
        verifiedAt: member.verifiedAt,
      })),
    });
  } catch (error) {
    console.error('Membership number list error:', error);
    return NextResponse.json({ error: 'Unable to load membership numbers' }, { status: 500 });
  }
}
