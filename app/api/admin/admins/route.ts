import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, hashPassword } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Admin from '@/lib/models/Admin';
import AuditLog from '@/lib/models/AuditLog';
import { createAdminSchema } from '@/lib/validations/admin';
import mongoose from 'mongoose';

export async function GET(_request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const isSuperAdmin = (session.role as string) === 'Super Admin';

    // Regular admins cannot see Super Admin accounts
    const query = isSuperAdmin ? {} : { role: { $ne: 'Super Admin' as const } };
    const admins = await Admin.find(query as Parameters<typeof Admin.find>[0]).select('-password').sort({ createdAt: -1 });

    return NextResponse.json({ success: true, admins, isSuperAdmin });
  } catch (error) {
    console.error('Admins fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if ((session.role as string) !== 'Super Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();

    const existing = await Admin.findOne({ email: parsed.data.email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'An admin with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(parsed.data.password);

    const admin = await Admin.create({
      ...parsed.data,
      password: hashedPassword,
    });

    // Log the action
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(session.adminId as string),
      adminName: session.email as string,
      action: 'CREATE_ADMIN',
      targetType: 'Admin',
      targetId: (admin._id as mongoose.Types.ObjectId).toString(),
      details: `Created admin account for ${admin.email} with role ${admin.role}`,
      timestamp: new Date(),
    });

    const { password: _pw, ...adminData } = admin.toObject();

    return NextResponse.json({ success: true, admin: adminData }, { status: 201 });
  } catch (error) {
    console.error('Admin create error:', error);
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
  }
}
