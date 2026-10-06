import { NextRequest, NextResponse } from 'next/server';
import { getMemberSession } from '@/lib/utils/member-auth';
import connectDB from '@/lib/db/mongodb';
import Member from '@/lib/models/Member';
import EventRegistration from '@/lib/models/EventRegistration';
import Event from '@/lib/models/Event';

type Params = { params: Promise<{ registrationId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    await connectDB();

    const { registrationId } = await params;

    const member = await Member.findById(session.memberId);
    if (!member) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }

    const reg = await EventRegistration.findById(registrationId);
    if (!reg) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }

    if (reg.memberId.toString() !== member._id.toString()) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    if (reg.paymentStatus === 'unpaid') {
      return NextResponse.json(
        { error: 'Payment required to access event card.' },
        { status: 403 }
      );
    }

    const event = await Event.findById(reg.eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      eventTitle: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      fullName: reg.fullName,
      membershipNumber: reg.membershipNumber,
      eventCardRef: reg.eventCardRef,
    });
  } catch (error) {
    console.error('Event-card GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch event card' }, { status: 500 });
  }
}
