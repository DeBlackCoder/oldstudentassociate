import { NextResponse } from 'next/server';
import CommunityContent from '@/lib/models/CommunityContent';
import { communitySchema } from '@/lib/community/validation';
import { publicContent } from '@/lib/community/policy';
import { assertId, HttpError, logCommunityAction, readJson, requireCommunityAdmin, routeError } from '@/lib/community/server';

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, { params }: Context) {
  try {
    const admin = await requireCommunityAdmin(true);
    const { id } = await params; assertId(id);
    const input = communitySchema.parse(await readJson(request));
    const existing = await CommunityContent.findById(id);
    if (!existing) throw new HttpError(404, 'Record not found');
    if (input.kind !== existing.kind) throw new HttpError(400, 'A record cannot move to a different section');
    const item = await CommunityContent.findByIdAndUpdate(id, { $set: { ...input, updatedBy: admin._id } }, { new: true, runValidators: true });
    if (!item) throw new HttpError(404, 'Record not found');
    await logCommunityAction(admin, 'UPDATE_COMMUNITY_CONTENT', id, `Updated ${item.kind}: ${item.title} (${item.status})`);
    return NextResponse.json({ success: true, item: publicContent(item.toObject() as unknown as Record<string, unknown>) });
  } catch (error) { return routeError(error); }
}
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const admin = await requireCommunityAdmin(true);
    const { id } = await params; assertId(id);
    const item = await CommunityContent.findByIdAndUpdate(id, { $set: { status: 'Archived', updatedBy: admin._id } }, { new: true });
    if (!item) throw new HttpError(404, 'Record not found');
    await logCommunityAction(admin, 'ARCHIVE_COMMUNITY_CONTENT', id, `Archived ${item.kind}: ${item.title}`);
    return NextResponse.json({ success: true });
  } catch (error) { return routeError(error); }
}
