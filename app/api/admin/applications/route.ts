import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';
import { submittedApplicationFilter } from '@/lib/registration/policy';

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10));

    await connectDB();

    const query: Record<string, unknown> = { ...submittedApplicationFilter };

    if (status && status !== 'all') {
      const requestedStatus = ['Pending', 'Approved', 'Rejected'].find(value => value.toLowerCase() === status.toLowerCase());
      if (!requestedStatus) return NextResponse.json({ error: 'Invalid application status' }, { status: 400 });
      query.status = requestedStatus;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { fullName: regex },
        { email: regex },
        { applicationRef: regex },
      ];
    }

    const total = await Applicant.countDocuments(query);
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const applications = await Applicant.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('applicationRef fullName email secondarySchool graduationYear status submittedAt');

    return NextResponse.json({
      success: true,
      applications,
      total,
      page,
      pages,
    });
  } catch (error) {
    console.error('Applications fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
