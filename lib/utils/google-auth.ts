import Admin from '@/lib/models/Admin';
import connectDB from '@/lib/db/mongodb';
import { hashPassword } from '@/lib/utils/auth';
import { ensureAdminMember } from '@/lib/utils/admin-member';
import { ensureGoogleMember, type GoogleMemberIdentity } from '@/lib/utils/google-member';
import { isBootstrapSuperAdminEmail } from '@/lib/utils/bootstrap-admin';
import { randomBytes } from 'node:crypto';

export async function resolveGoogleSignInAccount(identity: GoogleMemberIdentity) {
  const email = identity.email.trim().toLowerCase();
  await connectDB();

  if (isBootstrapSuperAdminEmail(email)) {
    const member = await ensureGoogleMember({ ...identity, email });
    const existingAdmin = await Admin.findOne({ email });
    const insertFields = existingAdmin ? undefined : {
      fullName: member.fullName || identity.name?.trim() || email.split('@')[0],
      password: await hashPassword(randomBytes(32).toString('hex')),
    };
    const admin = await Admin.findOneAndUpdate({ email }, {
      $set: { role: 'Super Admin', isActive: true, isDeleted: false, lastLogin: new Date() },
      ...(insertFields ? { $setOnInsert: insertFields } : {}),
    }, { upsert: true, new: true, runValidators: true });
    if (!admin) throw new Error('Unable to provision the bootstrap Super Admin account');
    const adminMember = await ensureAdminMember(admin);
    return { member: adminMember, admin };
  }

  const admin = await Admin.findOne({ email });
  if (admin && (!admin.isActive || admin.isDeleted)) return null;

  const member = await ensureGoogleMember({ ...identity, email });
  if (!admin) return { member };

  const adminMember = await ensureAdminMember(admin);
  admin.lastLogin = new Date();
  await admin.save();
  return { member: adminMember, admin };
}
