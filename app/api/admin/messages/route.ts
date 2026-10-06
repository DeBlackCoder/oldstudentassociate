import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import ContactMessage from '@/lib/models/ContactMessage';

// GET — list all messages, unread first
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const messages = await ContactMessage.find()
      .sort({ read: 1, createdAt: -1 })
      .lean();

    const unreadCount = await ContactMessage.countDocuments({ read: false });

    return NextResponse.json({ success: true, messages, unreadCount });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// PATCH — mark all as read
export async function PATCH() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    await ContactMessage.updateMany({ read: false }, { read: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
