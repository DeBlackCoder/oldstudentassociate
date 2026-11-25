'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

interface PaymentChoice {
  applicationRef: string;
  paymentStatus: 'unpaid' | 'paid' | 'failed';
  paymentClaimStatus: 'pending' | 'confirmed' | null;
}

function PaymentChoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('ref');
  const [choice, setChoice] = useState<PaymentChoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/member/registration-payment/claim', { cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load your payment options.');
        if (reference && result.applicationRef !== reference) throw new Error('This registration reference does not match your saved form.');
        return result as PaymentChoice;
      })
      .then(result => {
        if (!cancelled) {
          setChoice(result);
          if (result.paymentStatus === 'paid') router.replace('/members/dashboard?tab=application');
        }
      })
      .catch(reason => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load your payment options.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reference, router]);

  async function reportPaidInPerson() {
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/member/registration-payment/claim', { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to report your payment.');
      if (result.paymentStatus === 'paid') {
        router.replace('/members/dashboard?tab=application');
        return;
      }
      setChoice(current => current ? { ...current, paymentClaimStatus: result.paymentClaimStatus } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to report your payment.');
    } finally {
      setSubmitting(false);
    }
  }

  const paymentUrl = choice?.applicationRef
    ? `/register/payment?ref=${encodeURIComponent(choice.applicationRef)}`
    : '/members/dashboard?tab=registration-payment';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#ECEBE6] px-4 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-white/60 bg-white p-7 shadow-xl sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1a472a]">Registration payment</p>
        <h1 className="mt-3 text-2xl font-bold text-[#121417]">Have you already paid the ₦2,000 registration fee?</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          If you paid an administrator in person, report it and an administrator will verify receipt before your application is submitted for review. Otherwise, continue to the payment options.
        </p>
        {loading && <p role="status" className="mt-6 flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" />Checking your saved application…</p>}
        {error && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        {!loading && choice?.paymentClaimStatus === 'pending' ? (
          <div role="status" className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="flex items-center gap-2 font-semibold text-amber-900"><CheckCircle2 className="h-5 w-5" />Payment report sent</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">Your form is saved. An administrator must confirm your in-person payment before your application can be submitted for review.</p>
            <Link href="/members/dashboard?tab=registration-payment" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-900 underline">Check status in your dashboard <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : !loading && choice && choice.paymentStatus !== 'paid' ? (
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button type="button" disabled={submitting} onClick={reportPaidInPerson} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1a472a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2d5f3f] disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, I already paid
            </button>
            <Link href={paymentUrl} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-neutral-300 px-5 py-3 text-sm font-semibold text-[#121417] hover:bg-neutral-50">
              No, take me to payment <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
        <Link href="/members/dashboard?tab=edit-form" className="mt-6 block text-center text-sm text-neutral-500 underline">Back to registration form</Link>
      </section>
    </main>
  );
}

export default function PaymentChoiceClient() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Loading payment options…</div>}><PaymentChoiceContent /></Suspense>;
}
