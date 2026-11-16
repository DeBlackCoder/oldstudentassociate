import { NextResponse } from 'next/server';
import ScholarshipApplication from '@/lib/models/ScholarshipApplication';
import { assertId, HttpError, requireCommunityMember, routeError } from '@/lib/community/server';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireCommunityMember();
    const { id } = await params; assertId(id);
    const application = await ScholarshipApplication.findOneAndUpdate(
      { _id: id, memberId: member._id, status: { $in: ['Submitted', 'Under Review'] } },
      { $set: { status: 'Withdrawn' } }, { new: true },
    );
    if (!application) throw new HttpError(409, 'This application cannot be withdrawn');
    return NextResponse.json({ success: true });
  } catch (error) { return routeError(error); }
}
