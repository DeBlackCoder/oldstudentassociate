'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, CreditCard, Loader2, RefreshCw, XCircle } from 'lucide-react';

type VerificationState = { status: 'loading' | 'paid' | 'pending' | 'error'; message: string };
interface VerificationResponse { success: boolean; status?: 'Paid' | 'Pending'; message?: string; error?: string }

function Verification() {
  const query = useSearchParams();
  const reference = query.get('reference') || query.get('trxref') || query.get('ref');
  const [state, setState] = useState<VerificationState>({ status: 'loading', message: '' });
  const [attempt, setAttempt] = useState(0);
  const requestRef = useRef<{ key: string; promise: Promise<VerificationResponse> } | null>(null);

  useEffect(() => {
    if (!reference) return;
    let active = true;
    const key = `${reference}-${attempt}`;
    if (requestRef.current?.key !== key) {
      requestRef.current = { key, promise: fetch(`/api/member/dues/verify?reference=${encodeURIComponent(reference)}`, { cache: 'no-store' }).then(async response => {
        const result: VerificationResponse = await response.json();
        if (!response.ok) throw new Error(result.error || result.message || 'Unable to verify this payment. Please try again.');
        return result;
      }) };
    }
    requestRef.current.promise.then(result => {
      if (active) setState({ status: result.status === 'Paid' && result.success ? 'paid' : 'pending', message: result.message || 'The payment provider has not confirmed this transaction yet. Check your Payments tab shortly.' });
    }).catch(reason => { if (active) setState({ status: 'error', message: reason instanceof Error ? reason.message : 'Unable to verify your payment. Please try again.' }); });
    return () => { active = false; };
  }, [reference, attempt]);

  const current: VerificationState = reference ? state : { status: 'error', message: 'This link is missing a payment reference. Return to your Payments tab to check your dues.' };
  const retry = () => { setState({ status: 'loading', message: '' }); setAttempt(value => value + 1); };
  const Icon = current.status === 'paid' ? CheckCircle2 : current.status === 'pending' ? Clock3 : current.status === 'error' ? XCircle : Loader2;
  const iconColour = current.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : current.status === 'pending' ? 'bg-amber-100 text-amber-600' : current.status === 'error' ? 'bg-red-100 text-red-500' : 'bg-[#E4EBDD] text-[#1a472a]';

  return <div className="space-y-5 p-6 text-center sm:p-8"><div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${iconColour}`}><Icon className={`h-9 w-9 ${current.status === 'loading' ? 'animate-spin' : ''}`} /></div><h1 className="text-2xl font-bold text-[#173f26]">{current.status === 'paid' ? 'Dues payment confirmed' : current.status === 'pending' ? 'Confirmation is pending' : current.status === 'error' ? 'Unable to confirm payment' : 'Verifying your dues payment'}</h1><p role={current.status === 'error' ? 'alert' : 'status'} className="text-sm leading-6 text-neutral-600">{current.status === 'loading' ? 'We’re checking the transaction with Paystack and updating your quarterly dues record.' : current.message}</p>{reference && <p className="break-all rounded-xl bg-white p-3 font-mono text-[11px] leading-5 text-neutral-500">{reference}</p>}{current.status !== 'loading' && <div className="space-y-3"><Link href="/members/dashboard?tab=payments" className="flex items-center justify-center gap-2 rounded-full bg-[#1a472a] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#2d5f3f]">Return to Payments<ArrowRight className="h-4 w-4" /></Link>{current.status !== 'paid' && reference && <button type="button" onClick={retry} className="inline-flex items-center gap-2 text-sm font-medium text-[#1a472a] underline"><RefreshCw className="h-3.5 w-3.5" />Check again</button>}</div>}</div>;
}

export default function DuesCallbackPage() {
  return <main className="flex min-h-screen flex-col items-center justify-center bg-[#ECEBE6] px-4 py-20"><div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/70 bg-[#F6F5F0] shadow-2xl shadow-black/5"><div className="flex items-center gap-3 border-b border-neutral-200 px-6 py-5 sm:px-8"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a472a] text-white"><CreditCard className="h-5 w-5" /></div><div><p className="text-sm font-bold text-[#173f26]">RSSSOSAA</p><p className="text-xs text-neutral-500">Quarterly association dues</p></div></div><Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="h-7 w-7 animate-spin text-[#1a472a]" /></div>}><Verification /></Suspense></div><Link href="/" className="mt-6 text-xs text-neutral-500 hover:text-[#1a472a]">Back to the association website</Link></main>;
}
