import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';
import AuditLog from '@/lib/models/AuditLog';
import { generateMembershipNumber } from '@/lib/utils/reference-generator';
import { isHiddenAccount } from '@/lib/utils/account-visibility';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role === 'Verifier') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { remarks } = await request.json();
    const { id } = await params;

    await connectDB();

    const application = await Applicant.findById(id);

    if (!application || isHiddenAccount(application.email)) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'Pending') {
      return NextResponse.json(
        { error: 'Only pending applications can be approved' },
        { status: 400 }
      );
    }

    if (application.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Cannot approve application — membership fee payment has not been completed.' },
        { status: 400 }
      );
    }

    // Generate membership number
    const currentYear = new Date().getFullYear();
    const approvedCount = await Applicant.countDocuments({
      status: 'Approved',
      membershipNumber: { $regex: `^RSSSOSAA/${currentYear}/` }
    });

    const membershipNumber = generateMembershipNumber(currentYear, approvedCount + 1);

    // Update application
    application.status = 'Approved';
    application.membershipNumber = membershipNumber;
    application.verifiedAt = new Date();
    application.verifiedBy = new mongoose.Types.ObjectId(session.adminId as string);
    if (remarks) {
      application.adminRemarks = remarks;
    }
    await application.save();

    // Log action
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(session.adminId as string),
      adminName: session.email as string,
      action: 'Approve Application',
      targetType: 'Applicant',
      targetId: application._id.toString(),
      details: `Approved application ${application.applicationRef} - Membership: ${membershipNumber}`,
      timestamp: new Date()
    });

    // Send approval email
    try {
      const { sendApprovalEmail } = await import('@/lib/utils/email');
      await sendApprovalEmail(application.email, application.fullName, membershipNumber);
    } catch (emailErr) {
      console.error('Failed to send approval email:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Application approved successfully',
      membershipNumber
    });
  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json(
      { error: 'Failed to approve application' },
      { status: 500 }
    );
  }
}
