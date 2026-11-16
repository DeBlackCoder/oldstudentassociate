import { NextRequest, NextResponse } from 'next/server';
import ScholarshipApplication from '@/lib/models/ScholarshipApplication';
import { APPLICATION_STATUSES } from '@/lib/community/types';
import { canEditContent } from '@/lib/community/policy';
import { assertId, HttpError, requireCommunityAdmin, routeError } from '@/lib/community/server';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireCommunityAdmin();
    const scholarshipId = request.nextUrl.searchParams.get('scholarshipId');
    const status = request.nextUrl.searchParams.get('status');
    const query: Record<string, unknown> = {};
    if (scholarshipId) { assertId(scholarshipId); query.scholarshipId = scholarshipId; }
    if (status) {
      if (!APPLICATION_STATUSES.includes(status as typeof APPLICATION_STATUSES[number])) throw new HttpError(400, 'Invalid application status');
      query.status = status;
    }
    const applications = await ScholarshipApplication.find(query).select('+internalNotes').sort({ submittedAt: -1 }).lean();
    return NextResponse.json({ success: true, applications, canEdit: canEditContent(admin.role) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return routeError(error); }
}
