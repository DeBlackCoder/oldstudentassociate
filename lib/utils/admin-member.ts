import type { Types } from 'mongoose';
import Admin, { type IAdmin } from '@/lib/models/Admin';
import Member from '@/lib/models/Member';
import { getAdminSession } from '@/lib/utils/auth';
import { adminMatchesMember } from './admin-member-policy';

type AdminIdentity = Pick<IAdmin, 'email' | 'password' | 'fullName' | 'isActive' | 'isDeleted'> & { _id: Types.ObjectId };

/** Called only after trusted admin authentication, with an active DB connection. */
export async function ensureAdminMember(admin: AdminIdentity) {
  if (!admin.isActive || admin.isDeleted) throw new Error('Inactive administrators cannot provision an account');
  // A stable link preserves the member profile even if the admin login email changes.
  const linked = await Member.findOne({ adminId: admin._id });
  if (linked) {
    if (linked.isDeleted) throw new Error('Deleted accounts cannot be restored by signing in');
    if (!linked.emailVerified) {
      linked.emailVerified = true;
      linked.emailVerificationCode = undefined;
      linked.emailVerificationExpiry = undefined;
      await linked.save();
    }
    return linked;
  }

  // Existing profiles, passwords, drafts, payments and applicant links stay intact.
  // The conditional filter also prevents taking over another admin's member account.
  const member = await Member.findOneAndUpdate(
    { email: admin.email.toLowerCase(), $or: [{ adminId: { $exists: false } }, { adminId: admin._id }] },
    {
      $set: { adminId: admin._id, emailVerified: true },
      $unset: { emailVerificationCode: '', emailVerificationExpiry: '' },
      $setOnInsert: { password: admin.password, fullName: admin.fullName, profileComplete: false },
    },
    { upsert: true, new: true, runValidators: true },
  );
  if (!member) throw new Error('Unable to link the administrator account');
  return member;
}

/** Admin panel access requires a current, active admin session for this account. */
export async function getAccountAdmin(member: { adminId?: Types.ObjectId; email: string }) {
  const session = await getAdminSession();
  if (!session || typeof session.adminId !== 'string') return null;
  const admin = await Admin.findById(session.adminId).select('-password');
  if (!admin || admin.isDeleted || !adminMatchesMember(
    { id: admin._id.toString(), email: admin.email, isActive: admin.isActive },
    { adminId: member.adminId?.toString(), email: member.email },
  )) return null;
  return admin;
}
