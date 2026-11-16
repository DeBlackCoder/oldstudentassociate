import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import { AccountManagementError, deleteMemberAccount } from '@/lib/utils/account-management';

const schema = z.object({ confirmationEmail: z.string().email() }).strict();
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Type the account email address to confirm deletion' }, { status: 400 });
    await connectDB();
    await deleteMemberAccount(id, parsed.data.confirmationEmail, session);
    return NextResponse.json({ success: true, message: 'Account removed. Payment records retained for accounting.' });
  } catch (error) {
    if (error instanceof AccountManagementError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Unable to delete the account' }, { status: 500 });
  }
}
