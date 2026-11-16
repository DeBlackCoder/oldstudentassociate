import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAdminSession, hashPassword } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Admin from '@/lib/models/Admin';
import Member from '@/lib/models/Member';
import AuditLog from '@/lib/models/AuditLog';
import { createAdminSchema } from '@/lib/validations/admin';
import { ensureAdminMember } from '@/lib/utils/admin-member';
import { isHiddenAccount, visibleAccountFilter } from '@/lib/utils/account-visibility';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const isSuperAdmin = session.role === 'Super Admin';
    const query = { ...visibleAccountFilter, ...(!isSuperAdmin ? { role: { $ne: 'Super Admin' as const } } : {}) };
    const admins = await Admin.find(query).select('_id fullName email role isActive lastLogin createdAt').sort({ createdAt: -1 });
    return NextResponse.json({ success: true, admins, isSuperAdmin });
  } catch (error) {
    console.error('Admins fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const parsed = createAdminSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const email = parsed.data.email.trim().toLowerCase();
    if (isHiddenAccount(email)) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    await connectDB();
    if (await Admin.findOne({ email })) return NextResponse.json({ error: 'An admin with this email already exists' }, { status: 409 });
    const member = await Member.findOne({ email, isDeleted: { $ne: true } }).select('+password');
    const password = member?.password || await hashPassword(parsed.data.password);
    const admin = await Admin.create({ ...parsed.data, email, fullName: member?.fullName || parsed.data.fullName, password });
    await ensureAdminMember(admin);
    await AuditLog.create({ adminId: new mongoose.Types.ObjectId(session.adminId), adminName: session.email, action: 'CREATE_ADMIN', targetType: 'Admin', targetId: admin._id.toString(), details: `Created ${admin.role} access for ${admin.email}`, timestamp: new Date() });
    return NextResponse.json({ success: true, admin: { _id: admin._id.toString(), fullName: admin.fullName, email: admin.email, role: admin.role, isActive: admin.isActive } }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    if ((error as { code?: number }).code === 11000) return NextResponse.json({ error: 'An admin with this email already exists' }, { status: 409 });
    console.error('Admin create error:', error);
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
  }
}
