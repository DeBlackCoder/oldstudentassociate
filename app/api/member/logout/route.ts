import { NextResponse } from 'next/server';
import { clearMemberSession } from '@/lib/utils/member-auth';

export async function POST() {
  await clearMemberSession();
  return NextResponse.json({ success: true });
}
