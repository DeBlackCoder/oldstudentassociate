import bcrypt from 'bcryptjs';
import Admin from '@/lib/models/Admin';
import Member from '@/lib/models/Member';
import PasswordReset from '@/lib/models/PasswordReset';
import { sendPasswordResetEmail } from '@/lib/utils/email';
import { RESET_COOLDOWN_MS, RESET_EXPIRY_MS, generateResetToken, hashResetToken, passwordResetUrl } from './password-reset-policy';

export class PasswordResetError extends Error {}

async function accountForEmail(email: string) {
  const admin = await Admin.findOne({ email }).select('email isActive');
  if (admin) {
    if (!admin.isActive) return null;
    // A member belonging to another admin must never be synchronized by email alone.
    const member = await Member.findOne({ $or: [
      { adminId: admin._id },
      { email, adminId: { $exists: false } },
    ] }).select('email adminId');
    return { accountKey: `admin:${admin._id}`, adminId: admin._id, memberId: member?._id, deliveryEmail: admin.email };
  }
  const member = await Member.findOne({ email }).select('email adminId');
  if (!member) return null;
  if (member.adminId) {
    const linkedAdmin = await Admin.findById(member.adminId).select('email isActive');
    if (!linkedAdmin?.isActive) return null;
    return { accountKey: `admin:${linkedAdmin._id}`, adminId: linkedAdmin._id, memberId: member._id, deliveryEmail: linkedAdmin.email };
  }
  return { accountKey: `member:${member._id}`, memberId: member._id, deliveryEmail: member.email };
}

/** The caller returns the same message for missing accounts, cooldown and delivery errors. */
export async function requestPasswordReset(email: string, deliverEmail = sendPasswordResetEmail) {
  const account = await accountForEmail(email);
  if (!account) return;
  const { token, tokenHash } = generateResetToken();
  const resetUrl = passwordResetUrl(token);
  const now = new Date();
  await PasswordReset.init();
  try {
    const record = await PasswordReset.findOneAndUpdate({
      accountKey: account.accountKey,
      $or: [{ requestedAt: { $lte: new Date(now.getTime() - RESET_COOLDOWN_MS) } }, { requestedAt: { $exists: false } }],
    }, {
      $set: {
        accountKey: account.accountKey, adminId: account.adminId, memberId: account.memberId,
        tokenHash, requestedAt: now, expiresAt: new Date(now.getTime() + RESET_EXPIRY_MS),
      },
      $unset: { consumedAt: '' },
    }, { upsert: true, new: true, runValidators: true });
    if (!record) return;
    try {
      await deliverEmail(account.deliveryEmail, resetUrl);
    } catch {
      // Allow a retry if SMTP failed; never return a token or log the reset URL.
      await PasswordReset.deleteOne({ _id: record._id, tokenHash });
      throw new Error('Password reset email could not be delivered.');
    }
  } catch (error) {
    // A concurrent request or an account inside the cooldown hits the unique key.
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) return;
    throw error;
  }
}

export async function resetAccountPassword(token: string, password: string) {
  const tokenHash = hashResetToken(token);
  // Hash before claiming the token so validation/hash failures do not consume it.
  const passwordHash = await bcrypt.hash(password, 12);
  const changedAt = new Date();
  const record = await PasswordReset.findOneAndUpdate({
    tokenHash, expiresAt: { $gt: changedAt }, consumedAt: { $exists: false },
  }, { $set: { consumedAt: changedAt } }, { new: true });
  if (!record) throw new PasswordResetError('This reset link has expired or has already been used. Request a new one.');

  try {
    if (record.adminId) {
      const admin = await Admin.findById(record.adminId).select('email isActive');
      if (!admin?.isActive) throw new PasswordResetError('This account is unavailable. Contact the association for help.');
      // Resolve the current linked profile too: it may have been created after the email.
      const member = await Member.findOne({ $or: [
        { adminId: admin._id }, { email: admin.email, adminId: { $exists: false } },
      ] }).select('adminId');
      const updated = await Admin.updateOne({ _id: admin._id, isActive: true }, { $set: { password: passwordHash, passwordChangedAt: changedAt } });
      if (!updated.matchedCount) throw new PasswordResetError('This account is unavailable. Contact the association for help.');
      if (member) await Member.updateOne({ _id: member._id, $or: [{ adminId: admin._id }, { email: admin.email, adminId: { $exists: false } }] }, { $set: { password: passwordHash, passwordChangedAt: changedAt } });
    } else if (record.memberId) {
      const result = await Member.updateOne({ _id: record.memberId, adminId: { $exists: false } }, {
        $set: { password: passwordHash, passwordChangedAt: changedAt },
      });
      if (!result.matchedCount) throw new PasswordResetError('This account has changed. Request a new reset link.');
    } else throw new PasswordResetError('This reset link is invalid. Request a new one.');
  } catch (error) {
    // Database failures permit retrying the same link. Identity failures remain consumed.
    if (!(error instanceof PasswordResetError)) {
      await PasswordReset.updateOne({ _id: record._id, consumedAt: changedAt }, { $unset: { consumedAt: '' } });
    }
    throw error;
  }
}
