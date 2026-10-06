import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongodb';
import Member from '@/lib/models/Member';
import { generateVerificationCode } from '@/lib/utils/member-auth';
import { sendVerificationEmail } from '@/lib/utils/email';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    await connectDB();

    const existing = await Member.findOne({ email: email.toLowerCase() });
    if (existing && existing.emailVerified) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }

    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existing && !existing.emailVerified) {
      existing.password = hashedPassword;
      existing.emailVerificationCode = code;
      existing.emailVerificationExpiry = expiry;
      await existing.save();
    } else {
      await Member.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        emailVerified: false,
        emailVerificationCode: code,
        emailVerificationExpiry: expiry,
        profileComplete: false,
      });
    }

    // Send verification email (non-blocking — don't fail signup if email fails)
    try {
      await sendVerificationEmail(email.toLowerCase(), code);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
    }

    const response: Record<string, unknown> = {
      success: true,
      message: 'Verification code sent to your email.',
    };

    // In dev, also return the code so you can test without real email
    if (process.env.NODE_ENV !== 'production') {
      response.devCode = code;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 });
  }
}
