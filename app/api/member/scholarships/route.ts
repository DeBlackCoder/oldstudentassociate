import { NextResponse } from 'next/server';
import ScholarshipApplication from '@/lib/models/ScholarshipApplication';
import { requireCommunityMember, routeError } from '@/lib/community/server';

export async function GET() {
  try {
    const member = await requireCommunityMember();
    const applications = await ScholarshipApplication.find({ memberId: member._id }).select('-internalNotes -reviewedBy -memberId -declaration -__v').sort({ submittedAt: -1 }).lean();
    return NextResponse.json({ success: true, applications }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return routeError(error); }
}
