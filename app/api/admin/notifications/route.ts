import { NextResponse } from 'next/server';
import mongoose, { type QueryFilter } from 'mongoose';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Notification, { type INotification } from '@/lib/models/Notification';
import { HIDDEN_ACCOUNT_EMAIL, hiddenAccountIds, isHiddenAccount } from '@/lib/utils/account-visibility';

async function notificationScope(email: string): Promise<QueryFilter<INotification>> {
  const hidden = await hiddenAccountIds();
  const identifiers = [...hidden.memberIds, ...hidden.applicantIds, ...hidden.adminIds].map(String);
  const tokens = [HIDDEN_ACCOUNT_EMAIL, ...hidden.names, ...hidden.membershipNumbers, ...hidden.applicationRefs];
  const privateText = new RegExp(tokens.filter(Boolean).map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
  const common: QueryFilter<INotification> = {
    audience: { $ne: 'owner' },
    message: { $not: privateText },
    actorId: { $nin: identifiers },
    targetId: { $nin: identifiers },
  };
  return isHiddenAccount(email) ? { $or: [{ audience: 'owner' }, common] } : common;
}
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const scope = await notificationScope(session.email);
    const readerId = new mongoose.Types.ObjectId(session.adminId);
    const [items, unreadCount] = await Promise.all([
      Notification.find(scope).sort({ createdAt: -1 }).limit(30).lean(),
      Notification.countDocuments({ ...scope, readBy: { $ne: readerId } }),
    ]);
    const notifications = items.map(item => ({ _id: item._id, title: item.title, message: item.message, type: item.type,
      link: item.link, createdAt: item.createdAt, read: item.readBy?.some(id => id.toString() === session.adminId) || false }));
    return NextResponse.json({ success: true, notifications, unreadCount }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 }); }
}
export async function PATCH() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    await Notification.updateMany(await notificationScope(session.email), { $addToSet: { readBy: new mongoose.Types.ObjectId(session.adminId) } });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Failed to mark notifications read' }, { status: 500 }); }
}
