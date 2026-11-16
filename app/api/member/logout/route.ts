import { NextResponse } from 'next/server';
import { clearMemberSession } from '@/lib/utils/member-auth';
import { clearAdminSession } from '@/lib/utils/auth';

export async function POST() {
  await clearMemberSession();
  await clearAdminSession();
  return NextResponse.json({ success: true });
}
