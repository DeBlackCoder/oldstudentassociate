import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { requestPasswordReset } from '@/lib/utils/password-reset';
import { forgotPasswordSchema, passwordResetUrl, RESET_REQUEST_MESSAGE } from '@/lib/utils/password-reset-policy';

export async function POST(request: NextRequest) {
  let input: unknown;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, 'utf8') > 2048) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    // Configuration errors are returned consistently, independent of account existence.
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error('SMTP is not configured.');
    passwordResetUrl('configuration-check');
  } catch {
    return NextResponse.json({ error: 'Password recovery email is temporarily unavailable. Please contact the association.' }, { status: 503 });
  }
  try {
    await connectDB();
    await requestPasswordReset(parsed.data.email, undefined, { adminOnly: true });
  } catch {
    console.error('Password reset request could not be processed.');
    // Email delivery failures cannot reveal whether an email belongs to an account.
  }
  return NextResponse.json({ message: RESET_REQUEST_MESSAGE });
}
