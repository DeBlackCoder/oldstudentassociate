export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const { reference, amount, paid_at } = event.data;

      await connectDB();

      await Applicant.findOneAndUpdate(
        { applicationRef: reference },
        {
          paymentStatus: 'paid',
          paymentRef: reference,
          paymentAmount: amount,
          paidAt: new Date(paid_at || Date.now()),
        }
      );
    }

    // Always return 200 to Paystack
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 so Paystack doesn't retry indefinitely
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
