import { NextRequest, NextResponse } from 'next/server';
import Notification from '@/lib/models/Notification';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import { isHiddenAccount } from '@/lib/utils/account-visibility';

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== 'Super Admin' || !isHiddenAccount(session.email)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await connectDB();
    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1);
    const limit = 50;
    const query: Record<string, unknown> = { audience: 'owner', type: 'activity' };
    const search = request.nextUrl.searchParams.get('search')?.trim().slice(0, 100);
    if (search) {
      const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: pattern }, { message: pattern }];
    }
    const [items, total] = await Promise.all([
      Notification.find(query).select('title message action link createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Notification.countDocuments(query),
    ]);
    return NextResponse.json({ success: true, items, total, page, pages: Math.ceil(total / limit) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Unable to load activity' }, { status: 500 }); }
}
