import { NextRequest, NextResponse } from 'next/server';
import CommunityContent from '@/lib/models/CommunityContent';
import { communitySchema } from '@/lib/community/validation';
import { CONTENT_KINDS, type ContentKind } from '@/lib/community/types';
import { canEditContent, publicContent } from '@/lib/community/policy';
import { HttpError, logCommunityAction, readJson, requireCommunityAdmin, routeError } from '@/lib/community/server';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireCommunityAdmin();
    const kind = request.nextUrl.searchParams.get('kind') as ContentKind;
    if (!CONTENT_KINDS.includes(kind)) throw new HttpError(400, 'Choose a valid section');
    const items = await CommunityContent.find({ kind }).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ success: true, items: items.map(i => publicContent(i as unknown as Record<string, unknown>)), canEdit: canEditContent(admin.role) });
  } catch (error) { return routeError(error); }
}
export async function POST(request: Request) {
  try {
    const admin = await requireCommunityAdmin(true);
    const input = communitySchema.parse(await readJson(request));
    const item = await CommunityContent.create({ ...input, createdBy: admin._id, updatedBy: admin._id });
    await logCommunityAction(admin, 'CREATE_COMMUNITY_CONTENT', item._id.toString(), `Created ${item.kind}: ${item.title} (${item.status})`);
    return NextResponse.json({ success: true, item: publicContent(item.toObject() as unknown as Record<string, unknown>) }, { status: 201 });
  } catch (error) { return routeError(error); }
}
