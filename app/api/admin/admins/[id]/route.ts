import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAdminSession, hashPassword } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Admin from '@/lib/models/Admin';
import Member from '@/lib/models/Member';
import AuditLog from '@/lib/models/AuditLog';
import { updateAdminSchema } from '@/lib/validations/admin';
import { isHiddenAccount } from '@/lib/utils/account-visibility';
import { isBootstrapSuperAdminEmail } from '@/lib/utils/bootstrap-admin';
import { ensureAdminMember } from '@/lib/utils/admin-member';

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    await connectDB();
    const admin = await Admin.findById(id);
    if (!admin || admin.isDeleted || isHiddenAccount(admin.email)) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    const parsed = updateAdminSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const data = parsed.data;
    if (!Object.keys(data).length) return NextResponse.json({ error: 'Choose a change to make' }, { status: 400 });
    const email = data.email?.trim().toLowerCase();
    if (isBootstrapSuperAdminEmail(admin.email) && (data.isActive === false || (data.role && data.role !== 'Super Admin') || (email && email !== admin.email))) {
      return NextResponse.json({ error: 'The bootstrap Super Admin account cannot be demoted, deactivated, or renamed' }, { status: 400 });
    }
    if (id === session.adminId && (data.isActive === false || (data.role && data.role !== 'Super Admin'))) return NextResponse.json({ error: 'Cannot remove your own administrator access' }, { status: 400 });
    if (email && isHiddenAccount(email)) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    if (email && email !== admin.email) {
      const [otherAdmin, otherMember] = await Promise.all([Admin.exists({ email, _id: { $ne: admin._id } }), Member.exists({ email, adminId: { $ne: admin._id } })]);
      if (otherAdmin || otherMember) return NextResponse.json({ error: 'This email is already in use' }, { status: 409 });
    }
    const update: Record<string, unknown> = { ...data, ...(email ? { email } : {}) };
    if (data.password) { update.password = await hashPassword(data.password); update.passwordChangedAt = new Date(); }
    const updated = await Admin.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).select('_id fullName email role isActive lastLogin createdAt');
    const linkedUpdate: Record<string, unknown> = {};
    for (const field of ['email', 'fullName', 'password', 'passwordChangedAt']) if (field in update) linkedUpdate[field] = update[field];
    if (Object.keys(linkedUpdate).length) await Member.updateOne({ $or: [{ adminId: admin._id }, { email: admin.email, adminId: { $exists: false } }] }, { $set: linkedUpdate });
    if (data.isActive === false) await Member.updateOne({ adminId: admin._id }, { $unset: { adminId: '' } });
    if (data.isActive === true) await ensureAdminMember({ _id: admin._id, email: email || admin.email, fullName: data.fullName || admin.fullName, password: String(update.password || admin.password), isActive: true });
    await AuditLog.create({ adminId: new mongoose.Types.ObjectId(session.adminId), adminName: session.email, action: 'UPDATE_ADMIN', targetType: 'Admin', targetId: id, details: `Updated administrator ${admin.email}: ${Object.keys(data).filter(key => key !== 'password').join(', ')}${data.password ? '; password changed' : ''}`, timestamp: new Date() });
    return NextResponse.json({ success: true, admin: updated });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    if ((error as { code?: number }).code === 11000) return NextResponse.json({ error: 'This email is already in use' }, { status: 409 });
    console.error('Admin update error:', error);
    return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    await connectDB();
    const admin = await Admin.findById(id);
    if (!admin || admin.isDeleted || isHiddenAccount(admin.email)) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    if (isBootstrapSuperAdminEmail(admin.email)) return NextResponse.json({ error: 'The bootstrap Super Admin account cannot be removed' }, { status: 400 });
    if (id === session.adminId) return NextResponse.json({ error: 'Cannot remove your own administrator access' }, { status: 400 });
    await Admin.updateOne({ _id: admin._id }, { $set: { isActive: false } });
    await Member.updateOne({ adminId: admin._id }, { $unset: { adminId: '' } });
    await AuditLog.create({ adminId: new mongoose.Types.ObjectId(session.adminId), adminName: session.email, action: 'REVOKE_ADMIN_ACCESS', targetType: 'Admin', targetId: id, details: `Revoked administrator access for ${admin.email}; normal member account retained`, timestamp: new Date() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin removal error:', error);
    return NextResponse.json({ error: 'Failed to revoke administrator access' }, { status: 500 });
  }
}
