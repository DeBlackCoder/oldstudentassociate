import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

export const RESET_EXPIRY_MS = 30 * 60 * 1000;
export const RESET_COOLDOWN_MS = 60 * 1000;
export const RESET_REQUEST_MESSAGE = 'If an account exists for this email, a password reset link will be sent. Check your inbox and spam folder.';

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email('Enter a valid email address.'),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f\d]{64}$/, 'This reset link is invalid. Request a new one.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(72, 'Use no more than 72 characters.')
    .refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Your password must fit within 72 UTF-8 bytes. Use fewer characters.'),
}).strict();

export function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function generateResetToken() {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: hashResetToken(token) };
}

export function passwordResetUrl(token: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl && process.env.NODE_ENV === 'production') throw new Error('Password reset requires NEXT_PUBLIC_APP_URL.');
  const base = new URL(configuredUrl || 'http://localhost:3000');
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Invalid application URL configuration.');
  const url = new URL('/reset-password', base);
  url.searchParams.set('token', token);
  return url.toString();
}

/** New tokens use millisecond precision; older tokens still have the signed iat. */
export function sessionSurvivesPasswordChange(
  payload: { iat?: unknown; issuedAtMs?: unknown }, changedAt?: Date | null,
) {
  if (!changedAt) return true;
  const issuedAt = typeof payload.issuedAtMs === 'number' ? payload.issuedAtMs
    : typeof payload.iat === 'number' ? payload.iat * 1000 : NaN;
  return Number.isFinite(issuedAt) && issuedAt >= new Date(changedAt).getTime();
}
