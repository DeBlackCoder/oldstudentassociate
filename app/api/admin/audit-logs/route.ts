import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import AuditLog from '@/lib/models/AuditLog';

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10));

    await connectDB();

    const total = await AuditLog.countDocuments();
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({ success: true, logs, total, page, pages });
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
