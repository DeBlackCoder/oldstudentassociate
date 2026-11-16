import { NextRequest, NextResponse } from 'next/server';
import DuesCheckout from '@/lib/models/DuesCheckout';
import { requireCommunityMember, HttpError, routeError } from '@/lib/community/server';
import { confirmDuesTransaction, paymentError } from '@/lib/payments/server';
export async function GET(request: NextRequest) {
  try {
    const member = await requireCommunityMember();
    const reference = request.nextUrl.searchParams.get('reference');
    if (!reference || !/^DUES-[a-f\d]{24}-[a-f\d]{16}$/i.test(reference)) throw new HttpError(400, 'Invalid payment reference');
    if (!await DuesCheckout.exists({ reference, memberId: member._id })) throw new HttpError(404, 'Payment reference not found for your account');
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new HttpError(503, 'Paystack verification is not configured');
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(20_000), cache: 'no-store',
    });
    const payload = await response.json();
    if (!response.ok || !payload.status) throw new HttpError(502, 'Paystack could not verify this transaction. Please try again.');
    if (payload.data.status !== 'success') return NextResponse.json({ success: false, status: 'Pending', message: 'Paystack has not confirmed a successful payment yet. Please refresh your Payments tab shortly.' });
    const result = await confirmDuesTransaction(payload.data, member._id.toString());
    return NextResponse.json({ success: true, status: 'Paid', message: result.duplicate ? 'This quarter was already paid. This additional transaction has been flagged for administrator review.' : 'Payment confirmed automatically. Your quarter is now paid.' });
  } catch (error) { return paymentError(error) || routeError(error); }
}
