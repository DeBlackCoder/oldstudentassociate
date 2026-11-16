import { NextResponse } from 'next/server';
import { clearAdminSession } from '@/lib/utils/auth';
import { clearMemberSession } from '@/lib/utils/member-auth';

export async function POST() {
  try {
    await clearAdminSession();
    await clearMemberSession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
