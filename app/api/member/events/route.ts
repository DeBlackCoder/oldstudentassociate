import { NextResponse } from 'next/server';
import { getMemberSession } from '@/lib/utils/member-auth';
import connectDB from '@/lib/db/mongodb';
import Member from '@/lib/models/Member';
import Applicant from '@/lib/models/Applicant';
import Event from '@/lib/models/Event';
import EventRegistration from '@/lib/models/EventRegistration';

export async function GET() {
  try {
    const session = await getMemberSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    await connectDB();

    const member = await Member.findById(session.memberId);
    if (!member) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }

    const applicant = member.applicantId
      ? await Applicant.findById(member.applicantId).lean()
      : null;

    const events = await Event.find({ status: 'Published' }).sort({ date: 1 }).lean();

    const eventsWithRegistration = await Promise.all(
      events.map(async (e) => {
        const reg = applicant
          ? await EventRegistration.findOne({
              eventId: e._id,
              applicantId: applicant._id,
            }).lean()
          : null;

        return {
          ...e,
          isRegistered: !!reg,
          registrationId: reg?._id?.toString() ?? null,
          paymentStatus: reg?.paymentStatus ?? null,
        };
      })
    );

    return NextResponse.json({ success: true, events: eventsWithRegistration });
  } catch (error) {
    console.error('Member events GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
