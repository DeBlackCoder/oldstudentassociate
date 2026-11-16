import { NextRequest, NextResponse } from 'next/server';
import { requireCommunityMember, assertId, HttpError, routeError } from '@/lib/community/server';
import { confirmEventTransaction } from '@/lib/payments/events';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await requireCommunityMember(), { id } = await params;
    assertId(id);
    const reference = request.nextUrl.searchParams.get('reference');
    if (!reference || !/^EVT[-/][a-z\d/-]{1,150}$/i.test(reference)) throw new HttpError(400, 'Invalid event payment reference');
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new HttpError(503, 'Payment service not configured');
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store', signal: AbortSignal.timeout(20_000) });
    const payload = await response.json();
    if (!response.ok || !payload.status) throw new HttpError(502, 'Paystack could not verify this payment');
    if (payload.data.status !== 'success') return NextResponse.json({ success: false, status: 'pending' });
    await confirmEventTransaction(payload.data, member._id.toString(), id);
    return NextResponse.json({ success: true, status: 'paid' });
  } catch (error) { return routeError(error); }
}
