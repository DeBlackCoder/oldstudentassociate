import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Event from '@/lib/models/Event';
import EventRegistration from '@/lib/models/EventRegistration';
import Notification from '@/lib/models/Notification';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const events = await Event.find({}).sort({ date: -1 }).lean();

    const eventsWithCount = await Promise.all(
      events.map(async (e) => {
        const registrationCount = await EventRegistration.countDocuments({ eventId: e._id });
        return { ...e, registrationCount };
      })
    );

    return NextResponse.json({ success: true, events: eventsWithCount });
  } catch (error) {
    console.error('Admin events GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { title, description, date, location, registrationFee, isFree, maxAttendees, status } = body;

    if (!title || !description || !date || !location) {
      return NextResponse.json(
        { error: 'title, description, date and location are required' },
        { status: 400 }
      );
    }

    const adminId = (session as { adminId?: string }).adminId;

    const event = await Event.create({
      title,
      description,
      date: new Date(date),
      location,
      registrationFee: isFree ? 0 : Math.round(Number(registrationFee) * 100), // naira → kobo
      isFree: Boolean(isFree),
      maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
      status: status || 'Draft',
      createdBy: adminId,
    });

    await Notification.create({
      type: 'new_event',
      title: 'New Event Created',
      message: `New event created: ${title}`,
      link: '/admin/dashboard/events',
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error('Admin events POST error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
