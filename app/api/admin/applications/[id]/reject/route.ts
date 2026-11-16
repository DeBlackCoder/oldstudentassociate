import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';
import AuditLog from '@/lib/models/AuditLog';
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

    if (!remarks || !remarks.trim()) {
      return NextResponse.json(
        { error: 'Remarks are required for rejection' },
        { status: 400 }
      );
    }

    await connectDB();

    const application = await Applicant.findById(id);

    if (!application || isHiddenAccount(application.email)) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.status !== 'Pending') {
      return NextResponse.json(
        { error: 'Only pending applications can be rejected' },
        { status: 400 }
      );
    }

    if (application.paymentStatus !== 'paid') return NextResponse.json({ error: 'This saved form has not been submitted. Registration payment must be confirmed first.' }, { status: 400 });

    // Update application
    application.status = 'Rejected';
    application.verifiedAt = new Date();
    application.verifiedBy = new mongoose.Types.ObjectId(session.adminId as string);
    application.adminRemarks = remarks;
    await application.save();

    // Log action
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(session.adminId as string),
      adminName: session.email as string,
      action: 'Reject Application',
      targetType: 'Applicant',
      targetId: application._id.toString(),
      details: `Rejected application ${application.applicationRef} - Reason: ${remarks}`,
      timestamp: new Date()
    });

    // Send rejection email
    try {
      const { sendRejectionEmail } = await import('@/lib/utils/email');
      await sendRejectionEmail(application.email, application.fullName, remarks);
    } catch (emailErr) {
      console.error('Failed to send rejection email:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Application rejected successfully'
    });
  } catch (error) {
    console.error('Rejection error:', error);
    return NextResponse.json(
      { error: 'Failed to reject application' },
      { status: 500 }
    );
  }
}
