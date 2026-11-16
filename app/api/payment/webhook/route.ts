export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import connectDB from '@/lib/db/mongodb';
import { HttpError } from '@/lib/community/server';
import { confirmDuesTransaction } from '@/lib/payments/server';
import { confirmWelfareTransaction } from '@/lib/payments/welfare';
import { confirmMembershipTransaction } from '@/lib/payments/membership';
import { confirmEventTransaction } from '@/lib/payments/events';
import { notifyMembershipPayment } from '@/lib/payments/notifications';

export async function POST(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'Paystack is not configured' }, { status: 503 });
  const raw = await request.text(), signature = request.headers.get('x-paystack-signature') || '';
  const hash = createHmac('sha512', secret).update(raw).digest('hex');
  if (!/^[a-f\d]{128}$/i.test(signature) || !timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(signature, 'hex'))) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  let event;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid payload' }, { status: 400 }); }
  try {
    if (event.event === 'charge.success') {
      if (!event.data || typeof event.data.reference !== 'string') return NextResponse.json({ error: 'Missing transaction reference' }, { status: 400 });
      await connectDB();
      if (event.data.reference.startsWith('DUES-')) await confirmDuesTransaction(event.data);
      else if (event.data.reference.startsWith('WELFARE-')) await confirmWelfareTransaction(event.data);
      else if (/^EVT[-/]/.test(event.data.reference)) await confirmEventTransaction(event.data);
      else {
        const result = await confirmMembershipTransaction(event.data);
        if (result.changed) await notifyMembershipPayment(result.applicant);
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof HttpError && [400,404].includes(error.status)) {
      console.error('Paystack transaction ignored:', error.message);
      return NextResponse.json({ received: true, ignored: true });
    }
    // Retry transient database failures instead of silently losing payment confirmation.
    console.error('Paystack webhook processing failed');
    return NextResponse.json({ error: 'Payment confirmation temporarily unavailable' }, { status: 500 });
  }
}
