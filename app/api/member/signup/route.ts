import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Create your member account by continuing with Google.' },
    { status: 410 },
  );
}
