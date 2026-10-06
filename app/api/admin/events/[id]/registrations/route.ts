import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import EventRegistration from '@/lib/models/EventRegistration';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const registrations = await EventRegistration.find({ eventId: id })
      .sort({ registeredAt: -1 })
      .lean();

    return NextResponse.json({ success: true, registrations });
  } catch (error) {
    console.error('Admin event registrations GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
  }
}
