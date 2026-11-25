import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Administrator sign-in is available through the shared Google login.' },
    { status: 410 },
  );
}
