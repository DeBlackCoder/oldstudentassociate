import { NextResponse } from 'next/server';
import ScholarshipApplication from '@/lib/models/ScholarshipApplication';
import { reviewSchema } from '@/lib/community/validation';
import { assertId, HttpError, logCommunityAction, readJson, requireCommunityAdmin, routeError } from '@/lib/community/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireCommunityAdmin(true);
    const { id } = await params; assertId(id);
    const input = reviewSchema.parse(await readJson(request));
    const application = await ScholarshipApplication.findOneAndUpdate(
      { _id: id, status: { $ne: 'Withdrawn' } },
      { $set: { ...input, reviewedBy: admin._id, reviewedAt: new Date() } }, { new: true, runValidators: true },
    ).select('+internalNotes');
    if (!application) throw new HttpError(409, 'Application not found or already withdrawn');
    await logCommunityAction(admin, 'REVIEW_SCHOLARSHIP_APPLICATION', id, `${application.scholarshipTitle}: ${application.fullName} — ${input.status}`);
    return NextResponse.json({ success: true, application });
  } catch (error) { return routeError(error); }
}
