import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Applicant from '@/lib/models/Applicant';
import { requireCommunityMember, readJson, routeError } from '@/lib/community/server';
import { z } from 'zod';
import { registrationFeeKobo } from '@/lib/registration/policy';

export async function POST(request: NextRequest) {
  try {
    const member = await requireCommunityMember();
    const { applicationRef, email } = z.object({ applicationRef: z.string().max(100), email: z.string().email() }).strict().parse(await readJson(request));

    if (!applicationRef || !email) {
      return NextResponse.json(
        { error: 'Application reference and email are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const applicant = await Applicant.findOne({
      _id: member.applicantId,
      applicationRef,
      email: member.email,
    });

    if (!member.applicantId || !applicant || email.toLowerCase() !== member.email.toLowerCase()) {
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
    const amountKobo = applicant.paymentExpectedAmount || registrationFeeKobo();
    if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) return NextResponse.json({ error: 'Membership fee is not configured correctly.' }, { status: 503 });

    if (!secretKey) {
      return NextResponse.json(
        { error: 'Payment service not configured.' },
        { status: 500 }
      );
    }

    applicant.paymentExpectedAmount = amountKobo;
    await applicant.save();
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: applicant.email,
        amount: amountKobo,
        currency: 'NGN',
        // Paystack only allows alphanumeric, dash, underscore — replace / with -
        reference: applicationRef.replace(/\//g, '-'),
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
    return routeError(error);
  }
}
