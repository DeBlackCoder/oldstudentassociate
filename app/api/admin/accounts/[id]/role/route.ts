import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import { AccountManagementError, promoteMember } from '@/lib/utils/account-management';

const schema = z.object({ role: z.enum(['Admin', 'Verifier']) }).strict();
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Choose Admin or Verifier' }, { status: 400 });
    await connectDB();
    const admin = await promoteMember(id, parsed.data.role, session);
    return NextResponse.json({ success: true, admin });
  } catch (error) {
    if (error instanceof AccountManagementError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    if ((error as { code?: number }).code === 11000) return NextResponse.json({ error: 'This account already has administrator access. Refresh the list.' }, { status: 409 });
    console.error('Account promotion error:', error);
    return NextResponse.json({ error: 'Unable to change administrator access' }, { status: 500 });
  }
}
