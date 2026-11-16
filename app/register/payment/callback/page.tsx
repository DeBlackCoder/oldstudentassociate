'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { ArrowRight, CheckCircle, Loader2, XCircle } from 'lucide-react';

function CallbackContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('ref');

  const [status, setStatus] = useState<'loading' | 'paid' | 'failed'>('loading');
  const [applicantName, setApplicantName] = useState('');
  const [applicationRef, setApplicationRef] = useState('');

  useEffect(() => {
    if (!reference) return;

    fetch(`/api/payment/verify?reference=${encodeURIComponent(reference)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.status === 'paid') {
          setStatus('paid');
          setApplicantName(data.applicant?.fullName || '');
          setApplicationRef(data.applicant?.applicationRef || reference);
        } else {
          setStatus('failed');
          setApplicationRef(data.applicant?.applicationRef || '');
        }
      })
      .catch(() => setStatus('failed'));
  }, [reference]);

  if (status === 'loading' && reference) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#1a472a]" />
        <p className="text-neutral-600 font-medium">Verifying your payment...</p>
        <p className="text-sm text-neutral-400">Please wait, do not close this page.</p>
      </div>
    );
  }

  if (status === 'paid') {
    return (
      <div className="flex flex-col items-center text-center gap-5 py-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="h-10 w-10 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#121417]">Payment Confirmed!</h2>
          {applicantName && (
            <p className="text-neutral-600 mt-1">Thank you, <span className="font-semibold">{applicantName}</span>.</p>
          )}
        </div>

        <div className="w-full rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-left space-y-2">
          <p className="text-sm font-semibold text-emerald-800">What happens next?</p>
          <ul className="text-sm text-emerald-700 space-y-1 list-disc list-inside">
            <li>Your saved form has been submitted automatically for review</li>
            <li>You will be contacted once your membership is approved</li>
            <li>Use your application reference to track your status</li>
          </ul>
        </div>

        {applicationRef && (
          <div className="w-full rounded-2xl bg-white border border-neutral-100 px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Application Ref</span>
            <span className="text-xs font-bold text-[#1a472a] font-mono">{applicationRef}</span>
          </div>
        )}

        <Link
          href="/members/dashboard?tab=application"
          className="w-full flex h-12 items-center justify-center gap-2 rounded-full bg-[#1a472a] text-white font-semibold text-sm hover:bg-[#2d5f3f] transition-all active:scale-95"
        >
          View Dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // failed
  return (
    <div className="flex flex-col items-center text-center gap-5 py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <XCircle className="h-10 w-10 text-red-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-[#121417]">Payment Not Confirmed</h2>
        <p className="text-neutral-600 mt-1">We could not confirm your payment yet. Your registration form stays saved.</p>
      </div>

      <div className="w-full rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
        Check your payment status in the dashboard before making another payment. If money was debited, allow the payment confirmation to update or contact support.
      </div>

      <div className="flex flex-col sm:flex-row w-full gap-3">
        {applicationRef && (
          <Link
            href={`/register/payment?ref=${encodeURIComponent(applicationRef)}`}
            className="flex-1 h-12 flex items-center justify-center rounded-full bg-[#1a472a] text-white font-semibold text-sm hover:bg-[#2d5f3f] transition-all active:scale-95"
          >
            Try Again
          </Link>
        )}
        <Link
          href="/members/dashboard?tab=registration-payment"
          className="flex-1 h-12 flex items-center justify-center rounded-full border-2 border-[#1a472a] text-[#1a472a] font-semibold text-sm hover:bg-[#1a472a] hover:text-white transition-all active:scale-95"
        >
          Check Status
        </Link>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <div className="min-h-screen bg-[#ECEBE6] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-[#F6F5F0] rounded-3xl border border-white/60 shadow-2xl shadow-black/10 overflow-hidden">
        {/* Header */}
        <div className="bg-[#F6F5F0] border-b border-neutral-100 px-8 py-6 flex items-center gap-3">
          <Image src="/logo.png" alt="RSSSOSAA" width={36} height={36} className="object-contain" />
          <div>
            <p className="text-sm font-bold text-[#121417]">RSSSOSAA</p>
            <p className="text-xs text-neutral-500">Payment verification</p>
          </div>
        </div>

        <div className="px-8 py-4">
          <Suspense fallback={
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#1a472a]" />
            </div>
          }>
            <CallbackContent />
          </Suspense>
        </div>
      </div>

      <p className="mt-6 text-sm text-neutral-500">
        <Link href="/" className="hover:text-[#1a472a] transition-colors">← Back to home</Link>
      </p>
    </div>
  );
}
