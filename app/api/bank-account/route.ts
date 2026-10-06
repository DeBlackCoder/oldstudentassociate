import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import BankAccount from '@/lib/models/BankAccount';

// GET — public endpoint, returns bank account details for payment page
export async function GET() {
  try {
    await connectDB();
    const account = await BankAccount.findOne()
      .sort({ updatedAt: -1 })
      .select('bankName accountName accountNumber sortCode');

    if (!account) {
      return NextResponse.json({ success: false, account: null });
    }

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error('Public bank account fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch bank account' }, { status: 500 });
  }
}
