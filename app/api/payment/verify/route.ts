import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';

export async function GET(request: NextRequest) {
  try {
    const reference = request.nextUrl.searchParams.get('reference');

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required.' },
        { status: 400 }
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Payment service not configured.' },
        { status: 500 }
      );
    }

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
      }
    );

    const data = await paystackRes.json();

    if (!paystackRes.ok || !data.status) {
      return NextResponse.json(
        { error: data.message || 'Failed to verify payment.' },
        { status: 502 }
      );
    }

    const txn = data.data;
    const isPaid = txn.status === 'success';

    await connectDB();

    const applicant = await Applicant.findOne({ applicationRef: reference });

    if (!applicant) {
      return NextResponse.json(
        { error: 'Application not found for this reference.' },
        { status: 404 }
      );
    }

    if (isPaid) {
      applicant.paymentStatus = 'paid';
      applicant.paymentRef = txn.reference;
      applicant.paymentAmount = txn.amount;
      applicant.paidAt = new Date(txn.paid_at || Date.now());
      await applicant.save();

      // Notify admin of payment (non-blocking)
      try {
        const { notifyAdminPaymentReceived } = await import('@/lib/utils/email');
        const Notification = (await import('@/lib/models/Notification')).default;
        await Promise.all([
          notifyAdminPaymentReceived({
            fullName: applicant.fullName,
            email: applicant.email,
            applicationRef: applicant.applicationRef,
            paymentRef: txn.reference,
            paymentAmount: txn.amount,
          }),
          Notification.create({
            type: 'payment_received',
            title: 'Payment Received',
            message: `${applicant.fullName} paid the membership fee`,
            link: `/admin/dashboard/applications`,
          }),
        ]);
      } catch (emailErr) {
        console.error('Failed to send payment notification:', emailErr);
      }

      return NextResponse.json({
        success: true,
        status: 'paid',
        applicant: {
          fullName: applicant.fullName,
          applicationRef: applicant.applicationRef,
          email: applicant.email,
        },
      });
    } else {
      applicant.paymentStatus = 'failed';
      await applicant.save();

      return NextResponse.json({
        success: false,
        status: 'failed',
        message: 'Payment was not successful.',
      });
    }
  } catch (error) {
    console.error('Payment verify error:', error);
    return NextResponse.json(
      { error: 'An error occurred while verifying payment.' },
      { status: 500 }
    );
  }
}
