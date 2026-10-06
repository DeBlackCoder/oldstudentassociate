import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, hashPassword } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Admin from '@/lib/models/Admin';
import AuditLog from '@/lib/models/AuditLog';
import { updateAdminSchema } from '@/lib/validations/admin';
import mongoose from 'mongoose';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if ((session.role as string) !== 'Super Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Cannot deactivate own account
    if (id === (session.adminId as string) ) {
      const body = await request.json();
      if (body.isActive === false) {
        return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
      }
      // Re-parse for validation after the check
      const parsed = updateAdminSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }
      return await performUpdate(id, parsed.data, session);
    }

    const body = await request.json();
    const parsed = updateAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    return await performUpdate(id, parsed.data, session);
  } catch (error) {
    console.error('Admin update error:', error);
    return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 });
  }
}

async function performUpdate(
  id: string,
  data: Record<string, unknown>,
  session: Awaited<ReturnType<typeof getAdminSession>>
) {
  await connectDB();

  const admin = await Admin.findById(id);
  if (!admin) {
    return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { ...data };

  if (typeof updateData.password === 'string') {
    updateData.password = await hashPassword(updateData.password as string);
  }

  const updated = await Admin.findByIdAndUpdate(id, updateData, { new: true }).select('-password');

  await AuditLog.create({
    adminId: new mongoose.Types.ObjectId(session!.adminId as string),
    adminName: session!.email as string,
    action: 'UPDATE_ADMIN',
    targetType: 'Admin',
    targetId: id,
    details: `Updated admin account ${admin.email}`,
    timestamp: new Date(),
  });

  return NextResponse.json({ success: true, admin: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if ((session.role as string) !== 'Super Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Cannot delete own account
    if (id === (session.adminId as string)) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await connectDB();

    const admin = await Admin.findById(id);
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Soft-delete: set isActive to false
    await Admin.findByIdAndUpdate(id, { isActive: false });

    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(session.adminId as string),
      adminName: session.email as string,
      action: 'DEACTIVATE_ADMIN',
      targetType: 'Admin',
      targetId: id,
      details: `Deactivated admin account ${admin.email}`,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete error:', error);
    return NextResponse.json({ error: 'Failed to deactivate admin' }, { status: 500 });
  }
}
