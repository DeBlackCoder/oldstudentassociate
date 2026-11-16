import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';
import { submittedApplicationFilter } from '@/lib/registration/policy';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get statistics
    const [
      totalRegistered,
      pendingApplications,
      approvedMembers,
      rejectedApplications,
      newThisMonth,
      schools,
      recentApplications
    ] = await Promise.all([
      Applicant.countDocuments(submittedApplicationFilter),
      Applicant.countDocuments({ ...submittedApplicationFilter, status: 'Pending' }),
      Applicant.countDocuments({ ...submittedApplicationFilter, status: 'Approved' }),
      Applicant.countDocuments({ ...submittedApplicationFilter, status: 'Rejected' }),
      Applicant.countDocuments({
        ...submittedApplicationFilter,
        submittedAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }),
      Applicant.distinct('secondarySchool', submittedApplicationFilter),
      Applicant.find(submittedApplicationFilter)
        .sort({ submittedAt: -1 })
        .limit(10)
        .select('applicationRef fullName secondarySchool status submittedAt')
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalRegistered,
        pendingApplications,
        approvedMembers,
        rejectedApplications,
        newThisMonth,
        schoolsRepresented: schools.length
      },
      recentApplications
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
