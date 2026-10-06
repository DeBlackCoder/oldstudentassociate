import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import BankAccount from '@/lib/models/BankAccount';

// GET — return current bank account details (admin only)
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const account = await BankAccount.findOne().sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error('Bank account fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch bank account' }, { status: 500 });
  }
}

// PUT — create or update bank account details (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bankName, accountName, accountNumber, sortCode } = await request.json();

    if (!bankName || !accountName || !accountNumber) {
      return NextResponse.json(
        { error: 'Bank name, account name, and account number are required.' },
        { status: 400 }
      );
    }

    await connectDB();

    // Always keep a single document — upsert
    const account = await BankAccount.findOneAndUpdate(
      {},
      {
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        sortCode: sortCode?.trim() || '',
        updatedBy: session.email as string,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error('Bank account update error:', error);
    return NextResponse.json({ error: 'Failed to update bank account' }, { status: 500 });
  }
}
