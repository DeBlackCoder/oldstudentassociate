import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Event from '@/lib/models/Event';
import EventRegistration from '@/lib/models/EventRegistration';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const event = await Event.findById(id).lean();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const registrationCount = await EventRegistration.countDocuments({ eventId: id });

    return NextResponse.json({ success: true, event, registrationCount });
  } catch (error) {
    console.error('Admin event GET by id error:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();

    const updated = await Event.findByIdAndUpdate(id, { ...body }, { new: true, runValidators: true });
    if (!updated) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, event: updated });
  } catch (error) {
    console.error('Admin event PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status !== 'Draft') {
      return NextResponse.json(
        { error: 'Only Draft events can be deleted' },
        { status: 400 }
      );
    }

    await Event.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin event DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
