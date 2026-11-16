import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { resetAccountPassword, PasswordResetError } from '@/lib/utils/password-reset';
import { resetPasswordSchema } from '@/lib/utils/password-reset-policy';
import { clearAdminSession } from '@/lib/utils/auth';
import { clearMemberSession } from '@/lib/utils/member-auth';

export async function POST(request: NextRequest) {
  let input: unknown;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, 'utf8') > 4096) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Enter a new password using a valid reset link.' }, { status: 400 });
  }
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    await connectDB();
    await resetAccountPassword(parsed.data.token, parsed.data.password);
    await clearAdminSession();
    await clearMemberSession();
    return NextResponse.json({ message: 'Your password has been updated. Sign in with your new password.' });
  } catch (error) {
    if (error instanceof PasswordResetError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Password reset could not be completed.');
    return NextResponse.json({ error: 'Could not update your password. Please try again.' }, { status: 500 });
  }
}
