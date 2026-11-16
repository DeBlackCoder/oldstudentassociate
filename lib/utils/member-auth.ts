import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { sessionSurvivesPasswordChange } from './password-reset-policy';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const COOKIE_NAME = 'member-token';

export async function createMemberToken(memberId: string, email: string): Promise<string> {
  return await new SignJWT({ memberId, email, role: 'member', issuedAtMs: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyMemberToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'member' || typeof payload.memberId !== 'string' || !/^[a-f\d]{24}$/i.test(payload.memberId) || typeof payload.email !== 'string') return null;
    return { memberId: payload.memberId, email: payload.email, role: 'member', iat: payload.iat, issuedAtMs: payload.issuedAtMs };
  } catch {
    return null;
  }
}

export async function getMemberSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME);
  if (token) {
    const session = await verifyMemberToken(token.value);
    if (session) {
      const [{ default: connectDB }, { default: Member }] = await Promise.all([
        import('@/lib/db/mongodb'), import('@/lib/models/Member'),
      ]);
      await connectDB();
      const member = await Member.findById(session.memberId).select('email isDeleted passwordChangedAt');
      if (member && !member.isDeleted && sessionSurvivesPasswordChange(session, member.passwordChangedAt)) return { ...session, email: member.email };
    }
  }

  // Existing admin-only sessions can immediately use every normal account API.
  // Resolving here also works in server components without attempting a cookie write.
  const { getAdminSession } = await import('@/lib/utils/auth');
  const adminSession = await getAdminSession();
  if (!adminSession || typeof adminSession.adminId !== 'string') return null;
  const [{ default: connectDB }, { default: Admin }, { ensureAdminMember }] = await Promise.all([
    import('@/lib/db/mongodb'), import('@/lib/models/Admin'), import('@/lib/utils/admin-member'),
  ]);
  await connectDB();
  const admin = await Admin.findById(adminSession.adminId);
  if (!admin?.isActive || admin.isDeleted) return null;
  const member = await ensureAdminMember(admin);
  return { memberId: member._id.toString(), email: member.email, role: 'member' };
}

export async function setMemberSession(memberId: string, email: string) {
  const token = await createMemberToken(memberId, email);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearMemberSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function generateVerificationCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
