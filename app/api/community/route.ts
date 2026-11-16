import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import CommunityContent from '@/lib/models/CommunityContent';
import { CONTENT_KINDS, type ContentKind } from '@/lib/community/types';
import { publicContent } from '@/lib/community/policy';
import { HttpError, requireMinutesReader, routeError } from '@/lib/community/server';

export async function GET(request: NextRequest) {
  try {
    const kind = request.nextUrl.searchParams.get('kind') as ContentKind;
    if (!CONTENT_KINDS.includes(kind)) throw new HttpError(400, 'Choose a valid section');
    if (kind === 'minutes') await requireMinutesReader();
    else await connectDB();
    const items = await CommunityContent.find({ kind, status: 'Published' }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, items: items.map(item => publicContent(item as unknown as Record<string, unknown>)) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return routeError(error); }
}
