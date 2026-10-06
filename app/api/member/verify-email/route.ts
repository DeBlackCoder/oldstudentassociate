import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Member from '@/lib/models/Member';
import { setMemberSession } from '@/lib/utils/member-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
    }

    await connectDB();

    const member = await Member.findOne({ email: email.toLowerCase() }).select('+emailVerificationCode +emailVerificationExpiry');

    if (!member) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    if (member.emailVerified) {
      return NextResponse.json({ error: 'Email already verified.' }, { status: 400 });
    }

    if (!member.emailVerificationCode || member.emailVerificationCode !== String(code)) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    if (!member.emailVerificationExpiry || member.emailVerificationExpiry < new Date()) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    member.emailVerified = true;
    member.emailVerificationCode = undefined;
    member.emailVerificationExpiry = undefined;
    await member.save();

    await setMemberSession(member._id.toString(), member.email);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 });
  }
}
