import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const COOKIE_NAME = 'member-token';

export async function createMemberToken(memberId: string, email: string): Promise<string> {
  return await new SignJWT({ memberId, email, role: 'member' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyMemberToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { memberId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function getMemberSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME);
  if (!token) return null;
  return verifyMemberToken(token.value);
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
