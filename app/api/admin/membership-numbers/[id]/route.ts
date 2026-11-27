import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';
import EventRegistration from '@/lib/models/EventRegistration';
import AuditLog from '@/lib/models/AuditLog';
import { validateMembershipNumber } from '@/lib/utils/reference-generator';
import { isHiddenAccount } from '@/lib/utils/account-visibility';

const schema = z.object({
  membershipNumber: z.string().trim().min(1).max(80),
}).strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'Super Admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid membership number' }, { status: 400 });

    const membershipNumber = parsed.data.membershipNumber.toUpperCase();
    if (!validateMembershipNumber(membershipNumber)) {
      return NextResponse.json({ error: 'Use RSSSOSA/YYYY/NNNN or RSSSOSAA/YYYY/NNNNN' }, { status: 400 });
    }

    await connectDB();
    const member = await Applicant.findById(id);
    if (!member || member.status !== 'Approved' || isHiddenAccount(member.email)) {
      return NextResponse.json({ error: 'Approved member not found' }, { status: 404 });
    }
    if (member.membershipNumber === membershipNumber) {
      return NextResponse.json({ success: true, membershipNumber });
    }

    const duplicate = await Applicant.findOne({
      _id: { $ne: member._id },
      membershipNumber,
    }).select('_id');
    if (duplicate) return NextResponse.json({ error: 'That membership number is already assigned' }, { status: 409 });

    const previousNumber = member.membershipNumber;
    member.membershipNumber = membershipNumber;
    await member.save();
    if (member.memberId) {
      await EventRegistration.updateMany(
        { memberId: member.memberId },
        { $set: { membershipNumber } },
      );
    }
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(session.adminId as string),
      adminName: session.email as string,
      action: 'CHANGE_MEMBERSHIP_NUMBER',
      targetType: 'Applicant',
      targetId: member._id.toString(),
      details: `Changed membership number for ${member.fullName} from ${previousNumber || 'none'} to ${membershipNumber}`,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, membershipNumber });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      return NextResponse.json({ error: 'That membership number is already assigned' }, { status: 409 });
    }
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    console.error('Membership number update error:', error);
    return NextResponse.json({ error: 'Unable to update membership number' }, { status: 500 });
  }
}
