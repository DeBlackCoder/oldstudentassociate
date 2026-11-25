import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Member accounts are verified through Google sign-in.' },
    { status: 410 },
  );
}
