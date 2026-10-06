import { NextRequest, NextResponse } from 'next/server';
import { getMemberSession } from '@/lib/utils/member-auth';
import connectDB from '@/lib/db/mongodb';
import Member from '@/lib/models/Member';
import Applicant from '@/lib/models/Applicant';
import Event from '@/lib/models/Event';
import EventRegistration from '@/lib/models/EventRegistration';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    const member = await Member.findById(session.memberId);
    if (!member) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }

    if (!member.applicantId) {
      return NextResponse.json({ error: 'Membership application required.' }, { status: 403 });
    }

    const applicant = await Applicant.findById(member.applicantId);
    if (!applicant || applicant.status !== 'Approved') {
      return NextResponse.json(
        { error: 'Only approved members can register for events.' },
        { status: 403 }
      );
    }

    const event = await Event.findById(id);
    if (!event || event.status !== 'Published') {
      return NextResponse.json({ error: 'Event not found or not available.' }, { status: 404 });
    }

    const existing = await EventRegistration.findOne({
      eventId: id,
      applicantId: applicant._id,
    });
    if (existing) {
      return NextResponse.json({ error: 'Already registered for this event.' }, { status: 409 });
    }

    const totalCount = await EventRegistration.countDocuments({ eventId: id });
    const eventCardRef = `EVT/${id.toString().slice(-4)}/${new Date().getFullYear()}/${String(
      totalCount + 1
    ).padStart(4, '0')}`;

    if (event.isFree) {
      const reg = await EventRegistration.create({
        eventId: id,
        applicantId: applicant._id,
        memberId: member._id,
        fullName: applicant.fullName,
        email: applicant.email,
        membershipNumber: applicant.membershipNumber || '',
        paymentStatus: 'free',
        eventCardRef,
      });

      // Non-blocking email confirmation
      try {
        const { sendEventRegistrationConfirmation } = await import('@/lib/utils/email');
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        sendEventRegistrationConfirmation(
          applicant.email,
          applicant.fullName,
          event.title,
          event.date,
          event.location,
          eventCardRef,
          `${appUrl}/members/dashboard?tab=events`
        ).catch((err) => console.error('Event confirmation email error:', err));
      } catch (emailErr) {
        console.error('Failed to import email util:', emailErr);
      }

      return NextResponse.json({ success: true, registrationId: reg._id.toString() });
    }

    // Paid event — initialize Paystack
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Payment service not configured.' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: applicant.email,
        amount: event.registrationFee,
        reference: eventCardRef,
        callback_url: `${appUrl}/members/dashboard?tab=events&payment=success`,
        metadata: {
          eventId: id,
          applicantId: applicant._id.toString(),
          fullName: applicant.fullName,
        },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      return NextResponse.json(
        { error: paystackData.message || 'Failed to initialize payment.' },
        { status: 502 }
      );
    }

    // Save registration as unpaid pending payment
    await EventRegistration.create({
      eventId: id,
      applicantId: applicant._id,
      memberId: member._id,
      fullName: applicant.fullName,
      email: applicant.email,
      membershipNumber: applicant.membershipNumber || '',
      paymentStatus: 'unpaid',
      eventCardRef,
    });

    return NextResponse.json({
      success: true,
      authorizationUrl: paystackData.data.authorization_url,
    });
  } catch (error) {
    console.error('Member event register POST error:', error);
    return NextResponse.json({ error: 'Failed to register for event' }, { status: 500 });
  }
}
