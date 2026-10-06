import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAdminSession } from '@/lib/utils/auth';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';
import AuditLog from '@/lib/models/AuditLog';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { remarks } = await request.json();

    await connectDB();

    const application = await Applicant.findById(id);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'Payment is already marked as paid.' },
        { status: 400 }
      );
    }

    // Mark as manually paid via bank transfer
    application.paymentStatus = 'paid';
    application.paymentRef = `BANK-TRANSFER-${Date.now()}`;
    application.paymentAmount = parseInt(process.env.MEMBERSHIP_FEE_KOBO || '1000000');
    application.paidAt = new Date();
    if (remarks) application.adminRemarks = remarks;
    await application.save();

    // Audit log
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(session.adminId as string),
      adminName: session.email as string,
      action: 'Manual Payment Verification',
      targetType: 'Applicant',
      targetId: application._id.toString(),
      details: `Manually marked payment as paid for application ${application.applicationRef}${remarks ? ` — Note: ${remarks}` : ''}`,
      timestamp: new Date(),
    });

    // Notify admin of manual payment (non-blocking)
    try {
      const { notifyAdminPaymentReceived } = await import('@/lib/utils/email');
      await notifyAdminPaymentReceived({
        fullName: application.fullName,
        email: application.email,
        applicationRef: application.applicationRef,
        paymentRef: application.paymentRef,
        paymentAmount: application.paymentAmount,
      });
    } catch (notifyErr) {
      console.error('Failed to send payment notification:', notifyErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment manually verified. Application is now eligible for approval.',
    });
  } catch (error) {
    console.error('Mark paid error:', error);
    return NextResponse.json({ error: 'Failed to mark application as paid' }, { status: 500 });
  }
}
