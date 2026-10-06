import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongodb';
import Member from '@/lib/models/Member';
import Admin from '@/lib/models/Admin';
import Applicant from '@/lib/models/Applicant';
import { setMemberSession } from '@/lib/utils/member-auth';
import { setAdminSession } from '@/lib/utils/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    await connectDB();

    // ── 1. Check Admin collection first ──────────────────────────────
    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (admin) {
      if (!admin.isActive) {
        return NextResponse.json({ error: 'Your admin account has been deactivated.' }, { status: 403 });
      }
      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
      }
      // Set admin session cookie
      await setAdminSession(admin._id.toString(), admin.email, admin.role);
      return NextResponse.json({
        success: true,
        role: 'admin',
        admin: { fullName: admin.fullName, email: admin.email, role: admin.role },
      });
    }

    // ── 2. Check Member collection ────────────────────────────────────
    const member = await Member.findOne({ email: email.toLowerCase() }).select('+password');
    if (!member) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, member.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    if (!member.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in.', needsVerification: true, email: member.email },
        { status: 403 }
      );
    }

    await setMemberSession(member._id.toString(), member.email);

    // Fetch linked applicant data
    let applicantData = null;
    if (member.applicantId) {
      applicantData = await Applicant.findById(member.applicantId)
        .select('fullName status paymentStatus membershipNumber applicationRef secondarySchool graduationYear submittedAt paidAt');
    }

    return NextResponse.json({
      success: true,
      role: 'member',
      member: {
        email: member.email,
        profileComplete: member.profileComplete,
        fullName: member.fullName || applicantData?.fullName,
        status: applicantData?.status || 'Pending',
        paymentStatus: applicantData?.paymentStatus || 'unpaid',
        membershipNumber: applicantData?.membershipNumber,
        applicationRef: member.applicationRef || applicantData?.applicationRef,
        secondarySchool: applicantData?.secondarySchool,
        graduationYear: applicantData?.graduationYear,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
