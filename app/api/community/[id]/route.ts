import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import CommunityContent from '@/lib/models/CommunityContent';
import { publicContent } from '@/lib/community/policy';
import { assertId, HttpError, requireMinutesReader, routeError } from '@/lib/community/server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    assertId(id);
    await connectDB();
    const item = await CommunityContent.findOne({ _id: id, status: 'Published' }).lean();
    if (!item) throw new HttpError(404, 'This content is not available');
    if (item.kind === 'minutes') await requireMinutesReader();
    return NextResponse.json({ success: true, item: publicContent(item as unknown as Record<string, unknown>) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return routeError(error); }
}
