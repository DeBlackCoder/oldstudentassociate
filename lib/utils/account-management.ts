import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import Admin from '@/lib/models/Admin';
import Member from '@/lib/models/Member';
import Applicant from '@/lib/models/Applicant';
import AuditLog from '@/lib/models/AuditLog';
import PasswordReset from '@/lib/models/PasswordReset';
import EventRegistration from '@/lib/models/EventRegistration';
import ScholarshipApplication from '@/lib/models/ScholarshipApplication';
import { ensureAdminMember } from './admin-member';
import { isBootstrapSuperAdminEmail } from './bootstrap-admin';
import { hashPassword } from './auth';
import { isHiddenAccount } from './account-visibility';

export class AccountManagementError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
type Actor = { adminId: string; email: string; role: string };
type AccountIdentity = { _id: mongoose.Types.ObjectId; email: string; adminId?: mongoose.Types.ObjectId; isDeleted?: boolean };

export function assertManageableAccount(target: AccountIdentity, actor: Actor) {
  if (isHiddenAccount(target.email) || target.isDeleted) throw new AccountManagementError('Account not found', 404);
  if (target.adminId?.toString() === actor.adminId) throw new AccountManagementError('You cannot remove your own account or administrator access', 400);
}

/** Promotion retains the existing member password and profile, including all payments. */
export async function promoteMember(memberId: string, role: 'Admin' | 'Verifier', actor: Actor) {
  if (actor.role !== 'Super Admin') throw new AccountManagementError('Forbidden', 403);
  const member = await Member.findById(memberId).select('+password');
  if (!member) throw new AccountManagementError('Account not found', 404);
  assertManageableAccount(member, actor);
  const existing = member.adminId
    ? await Admin.findById(member.adminId)
    : await Admin.findOne({ email: member.email });
  if (existing && (isHiddenAccount(existing.email) || existing.isDeleted)) throw new AccountManagementError('Account not found', 404);
  if (existing?.role === 'Super Admin') throw new AccountManagementError('Use administrator management for this account', 400);
  const fullName = member.fullName || member.email.split('@')[0];
  const now = new Date();
  const admin = existing
    ? await Admin.findByIdAndUpdate(existing._id, { $set: { role, isActive: true, password: member.password, fullName, ...(existing.password !== member.password ? { passwordChangedAt: now } : {}) } }, { new: true, runValidators: true })
    : await Admin.create({ email: member.email, fullName, password: member.password, role, isActive: true });
  if (!admin) throw new AccountManagementError('Unable to grant administrator access', 409);
  await ensureAdminMember(admin);
  await AuditLog.create({ adminId: new mongoose.Types.ObjectId(actor.adminId), adminName: actor.email, action: 'GRANT_ADMIN_ACCESS', targetType: 'Member', targetId: memberId, details: `Granted ${role} access to ${member.email}`, timestamp: now });
  return { _id: admin._id.toString(), email: admin.email, fullName: admin.fullName, role: admin.role, isActive: admin.isActive };
}

/** Keep payment evidence and immutable references, but remove access and personal profile data. */
export async function deleteMemberAccount(memberId: string, confirmationEmail: string, actor: Actor) {
  if (actor.role !== 'Super Admin') throw new AccountManagementError('Forbidden', 403);
  const member = await Member.findById(memberId);
  if (!member) throw new AccountManagementError('Account not found', 404);
  assertManageableAccount(member, actor);
  if (confirmationEmail.trim().toLowerCase() !== member.email.toLowerCase()) throw new AccountManagementError('Type the account email address to confirm deletion', 400);
  const admin = member.adminId ? await Admin.findById(member.adminId) : await Admin.findOne({ email: member.email });
  if (isBootstrapSuperAdminEmail(member.email) || isBootstrapSuperAdminEmail(admin?.email)) throw new AccountManagementError('The bootstrap Super Admin account cannot be deleted', 400);
  if (admin && (isHiddenAccount(admin.email) || admin._id.toString() === actor.adminId)) throw new AccountManagementError('Account not found', 404);
  const now = new Date(), originalEmail = member.email;
  const removedEmail = `deleted-${memberId}@accounts.invalid`;
  const lockedPassword = await hashPassword(randomBytes(48).toString('hex'));
  // Revoke access first. The rest is idempotent cleanup of retained records.
  await Member.updateOne({ _id: member._id, isDeleted: { $ne: true } }, {
    $set: { isDeleted: true, email: removedEmail, fullName: 'Deleted member', password: lockedPassword, passwordChangedAt: now, emailVerified: false, profileComplete: false },
    $unset: { emailVerificationCode: '', emailVerificationExpiry: '', formDraft: '' },
  });
  if (admin) await Admin.updateOne({ _id: admin._id }, { $set: { isDeleted: true, isActive: false, email: `deleted-admin-${admin._id}@accounts.invalid`, fullName: 'Deleted administrator', password: lockedPassword, passwordChangedAt: now } });
  await PasswordReset.deleteMany({ $or: [{ memberId: member._id }, ...(admin ? [{ adminId: admin._id }] : []), { accountKey: originalEmail }] });
  if (member.applicantId) await Applicant.updateOne({ _id: member.applicantId }, {
    $set: { email: removedEmail, fullName: 'Deleted member', dateOfBirth: new Date('1970-01-01'), phoneNumber: 'Deleted', whatsappNumber: 'Deleted', residentialAddress: 'Deleted', stateOfOrigin: 'Deleted', lga: 'Deleted', secondarySchool: 'Deleted', currentOccupation: 'Deleted', skills: [], contributionAreas: [], signature: 'Deleted' },
    $unset: { positionHeldInSchool: '', organizationName: '', otherContributionArea: '', referredBy: '', adminRemarks: '' },
  });
  await EventRegistration.updateMany({ memberId: member._id }, { $set: { fullName: 'Deleted member', email: removedEmail } });
  await ScholarshipApplication.updateMany({ memberId: member._id }, { $set: { fullName: 'Deleted member', email: removedEmail, phoneNumber: 'Deleted', institution: 'Deleted', courseOfStudy: 'Deleted', academicLevel: 'Deleted', academicResult: 'Deleted', statement: 'Deleted', documents: [], internalNotes: '', feedback: '' } });
  await AuditLog.create({ adminId: new mongoose.Types.ObjectId(actor.adminId), adminName: actor.email, action: 'DELETE_USER_ACCOUNT', targetType: 'Member', targetId: memberId, details: 'Deleted user access and anonymized the profile; payment amounts and transaction references retained for accounting.', timestamp: now });
}
