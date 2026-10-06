import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';

export async function POST(request: NextRequest) {
  try {
    const { applicationRef, email } = await request.json();

    if (!applicationRef || !email) {
      return NextResponse.json(
        { error: 'Application reference and email are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const applicant = await Applicant.findOne({
      applicationRef,
      email: email.toLowerCase(),
    });

    if (!applicant) {
      return NextResponse.json(
        { error: 'Application not found. Check your reference and email.' },
        { status: 404 }
      );
    }

    if (applicant.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'Payment already completed for this application.' },
        { status: 400 }
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const amountKobo = parseInt(process.env.MEMBERSHIP_FEE_KOBO || '1000000');

    if (!secretKey) {
      return NextResponse.json(
        { error: 'Payment service not configured.' },
        { status: 500 }
      );
    }

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: applicant.email,
        amount: amountKobo,
        reference: applicationRef,
        callback_url: `${appUrl}/register/payment/callback`,
        metadata: {
          applicationRef: applicant.applicationRef,
          fullName: applicant.fullName,
        },
      }),
    });

    const data = await paystackRes.json();

    if (!paystackRes.ok || !data.status) {
      return NextResponse.json(
        { error: data.message || 'Failed to initialize payment.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('Payment initialize error:', error);
    return NextResponse.json(
      { error: 'An error occurred while initializing payment.' },
      { status: 500 }
    );
  }
}
