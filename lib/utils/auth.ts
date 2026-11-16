import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { sessionSurvivesPasswordChange } from './password-reset-policy';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createToken(payload: { adminId: string; email: string; role: string }) {
  return await new SignJWT({ ...payload, issuedAtMs: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const { adminId, email, role } = verified.payload;
    if (typeof adminId !== 'string' || !/^[a-f\d]{24}$/i.test(adminId) || typeof email !== 'string' || !['Super Admin', 'Admin', 'Verifier'].includes(String(role))) return null;
    return verified.payload;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-token');

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token.value);
  if (!payload || typeof payload.adminId !== 'string') return null;
  const [{ default: connectDB }, { default: Admin }] = await Promise.all([
    import('@/lib/db/mongodb'), import('@/lib/models/Admin'),
  ]);
  await connectDB();
  const admin = await Admin.findById(payload.adminId).select('email role isActive isDeleted passwordChangedAt');
  if (!admin?.isActive || admin.isDeleted || !sessionSurvivesPasswordChange(payload, admin.passwordChangedAt)) return null;
  // Permission changes take effect immediately for an existing valid session.
  return { ...payload, adminId: payload.adminId, email: admin.email, role: admin.role };
}

export async function setAdminSession(adminId: string, email: string, role: string) {
  const token = await createToken({ adminId, email, role });
  const cookieStore = await cookies();
  
  cookieStore.set('admin-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 // 24 hours
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete('admin-token');
}
