import { NextRequest, NextResponse } from 'next/server';
import { HttpError, routeError, requireCommunityMember } from '@/lib/community/server';
import { confirmMembershipTransaction } from '@/lib/payments/membership';
import { notifyMembershipPayment } from '@/lib/payments/notifications';

export async function GET(request: NextRequest) {
  try {
    const member = await requireCommunityMember();
    if (!member.applicantId) throw new HttpError(404, 'Save your registration form before making payment');
    const reference = request.nextUrl.searchParams.get('reference');
    if (!reference || !/^[a-z\d_-]{1,200}$/i.test(reference)) throw new HttpError(400, 'A valid payment reference is required');
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new HttpError(503, 'Payment service not configured');
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store', signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json();
    if (!response.ok || !payload.status) throw new HttpError(502, 'Paystack could not verify this payment');
    if (payload.data.status !== 'success') return NextResponse.json({ success: false, status: 'failed', message: 'Payment has not been confirmed by Paystack. Please check again shortly.' });
    const { applicant, changed } = await confirmMembershipTransaction(payload.data, member.applicantId.toString());
    if (changed) await notifyMembershipPayment(applicant);
    return NextResponse.json({ success: true, status: 'paid', applicant: { fullName: applicant.fullName, applicationRef: applicant.applicationRef, email: applicant.email } });
  } catch (error) { return routeError(error); }
}
