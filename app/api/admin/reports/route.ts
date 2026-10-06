import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';

export async function GET(_request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [
      applicationsByMonth,
      topSchools,
      byEmploymentType,
      byGraduationDecadeRaw,
      genderSplit,
    ] = await Promise.all([
      // 1. Applications by month (last 12 months)
      Applicant.aggregate([
        { $match: { submittedAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$submittedAt' },
              month: { $month: '$submittedAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
          $project: {
            _id: 0,
            month: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                {
                  $cond: [
                    { $lt: ['$_id.month', 10] },
                    { $concat: ['0', { $toString: '$_id.month' }] },
                    { $toString: '$_id.month' },
                  ],
                },
              ],
            },
            count: 1,
          },
        },
      ]),

      // 2. Top 10 schools by applicant count
      Applicant.aggregate([
        {
          $group: {
            _id: '$secondarySchool',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, school: '$_id', count: 1 } },
      ]),

      // 3. By employment type
      Applicant.aggregate([
        {
          $group: {
            _id: '$employmentType',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $project: { _id: 0, type: '$_id', count: 1 } },
      ]),

      // 4. By graduation decade
      Applicant.aggregate([
        {
          $bucket: {
            groupBy: '$graduationYear',
            boundaries: [1960, 1970, 1980, 1990, 2000, 2010, 2020, 2030],
            default: 'Other',
            output: { count: { $sum: 1 } },
          },
        },
      ]),

      // 5. Gender split
      Applicant.aggregate([
        {
          $group: {
            _id: '$gender',
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, gender: '$_id', count: 1 } },
      ]),
    ]);

    // Label decade buckets e.g. '1970s'
    const byGraduationDecade = (byGraduationDecadeRaw as Array<{ _id: number | string; count: number }>).map(
      (bucket) => ({
        decade: typeof bucket._id === 'number' ? `${bucket._id}s` : bucket._id,
        count: bucket.count,
      })
    );

    return NextResponse.json({
      success: true,
      applicationsByMonth,
      topSchools,
      byEmploymentType,
      byGraduationDecade,
      genderSplit,
    });
  } catch (error) {
    console.error('Reports fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
