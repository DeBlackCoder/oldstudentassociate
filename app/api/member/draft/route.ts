import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Member from '@/lib/models/Member';
import { getMemberSession } from '@/lib/utils/member-auth';

export async function GET() {
  try {
    const session = await getMemberSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    await connectDB();
    const member = await Member.findById(session.memberId);
    if (!member) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    return NextResponse.json({
      success: true,
      draft: member.formDraft || null,
      profileComplete: member.profileComplete,
      applicationRef: member.applicationRef || null,
    });
  } catch (error) {
    console.error('Draft GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch draft.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getMemberSession();
    if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    await connectDB();
    const member = await Member.findById(session.memberId);
    if (!member) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    if (member.profileComplete) return NextResponse.json({ success: true, message: 'Already submitted' });
    const body = await request.json();
    const { formData } = body as { formData: Record<string, unknown>; step: number };
    await Member.findByIdAndUpdate(session.memberId, { formDraft: formData });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Draft POST error:', error);
    return NextResponse.json({ error: 'Failed to save draft.' }, { status: 500 });
  }
}
