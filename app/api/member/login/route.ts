import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Member sign-in is available through Google.' },
    { status: 410 },
  );
}
