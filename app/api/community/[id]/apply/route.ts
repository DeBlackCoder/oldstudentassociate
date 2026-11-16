import { NextResponse } from 'next/server';
import CommunityContent from '@/lib/models/CommunityContent';
import ScholarshipApplication from '@/lib/models/ScholarshipApplication';
import { scholarshipApplicationSchema } from '@/lib/community/validation';
import { applicationWindow } from '@/lib/community/policy';
import { assertId, HttpError, readJson, requireCommunityMember, routeError } from '@/lib/community/server';
import type { CommunityRecord } from '@/lib/community/types';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireCommunityMember();
    const { id } = await params; assertId(id);
    const scholarship = await CommunityContent.findOne({ _id: id, kind: 'scholarships', status: 'Published' }).lean();
    if (!scholarship) throw new HttpError(404, 'Scholarship not available');
    const record = scholarship as unknown as Extract<CommunityRecord, { kind: 'scholarships' }>;
    if (applicationWindow(record) !== 'Open') throw new HttpError(400, 'Applications are not open for this scholarship');
    const input = scholarshipApplicationSchema.parse(await readJson(request));
    const required = record.details.requiredDocuments;
    if (required.some(label => !input.documents.some(doc => doc.label === label))) throw new HttpError(400, 'Provide a document link for each required document');
    await ScholarshipApplication.init();
    const application = await ScholarshipApplication.create({
      ...input, scholarshipId: id, scholarshipTitle: scholarship.title, memberId: member._id, email: member.email,
    });
    return NextResponse.json({ success: true, applicationId: application._id.toString() }, { status: 201 });
  } catch (error) { return routeError(error); }
}
