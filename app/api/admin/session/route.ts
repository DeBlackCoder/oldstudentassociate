import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Admin from '@/lib/models/Admin';

export async function GET() {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    await connectDB();

    const admin = await Admin.findById(session.adminId).select('-password');

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Session check failed' },
      { status: 500 }
    );
  }
}
