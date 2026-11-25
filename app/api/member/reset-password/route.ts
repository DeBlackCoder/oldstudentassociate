import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Password sign-in is disabled. Use the shared Google login.' },
    { status: 410 },
  );
}
