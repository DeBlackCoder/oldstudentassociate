import { NextRequest, NextResponse } from 'next/server';
import { getMemberSession } from '@/lib/utils/member-auth';
import connectDB from '@/lib/db/mongodb';
import EventRegistration from '@/lib/models/EventRegistration';
import Event from '@/lib/models/Event';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params: _params }: Params) {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    await connectDB();

    const reference = request.nextUrl.searchParams.get('reference');
    if (!reference) {
      return NextResponse.json({ error: 'Payment reference is required.' }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Payment service not configured.' }, { status: 500 });
    }

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );

    const data = await paystackRes.json();

    if (!paystackRes.ok || !data.status) {
      return NextResponse.json(
        { error: data.message || 'Failed to verify payment.' },
        { status: 502 }
      );
    }

    const txn = data.data;

    if (txn.status !== 'success') {
      return NextResponse.json({ success: false, status: 'failed' });
    }

    const reg = await EventRegistration.findOne({ eventCardRef: reference });
    if (!reg) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }

    reg.paymentStatus = 'paid';
    reg.paymentRef = txn.reference;
    reg.paidAt = new Date(txn.paid_at || Date.now());
    await reg.save();

    const event = await Event.findById(reg.eventId);

    // Non-blocking confirmation email
    try {
      const { sendEventRegistrationConfirmation } = await import('@/lib/utils/email');
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      if (event) {
        sendEventRegistrationConfirmation(
          reg.email,
          reg.fullName,
          event.title,
          event.date,
          event.location,
          reg.eventCardRef || reference,
          `${appUrl}/members/dashboard?tab=events`
        ).catch((err) => console.error('Event confirmation email error:', err));
      }
    } catch (emailErr) {
      console.error('Failed to send event confirmation email:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Event verify-payment GET error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
