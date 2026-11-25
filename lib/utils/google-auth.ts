import Admin from '@/lib/models/Admin';
import connectDB from '@/lib/db/mongodb';
import { ensureAdminMember } from '@/lib/utils/admin-member';
import { ensureGoogleMember, type GoogleMemberIdentity } from '@/lib/utils/google-member';

export async function resolveGoogleSignInAccount(identity: GoogleMemberIdentity) {
  const email = identity.email.trim().toLowerCase();
  await connectDB();

  const admin = await Admin.findOne({ email });
  if (admin && (!admin.isActive || admin.isDeleted)) return null;

  const member = await ensureGoogleMember({ ...identity, email });
  if (!admin) return { member };

  const adminMember = await ensureAdminMember(admin);
  admin.lastLogin = new Date();
  await admin.save();
  return { member: adminMember, admin };
}
