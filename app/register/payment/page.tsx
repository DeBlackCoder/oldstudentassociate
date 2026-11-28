'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { ArrowRight, Building2, CheckCircle, Copy, CreditCard, Loader2, ShieldCheck } from 'lucide-react';

interface BankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode?: string;
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  const [applicantName, setApplicantName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [copied, setCopied] = useState('');
  const [activeTab, setActiveTab] = useState<'paystack' | 'transfer'>('paystack');
  const [registrationFeeKobo, setRegistrationFeeKobo] = useState(200_000);
  const [canPay, setCanPay] = useState(false);

  const amountFormatted = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(registrationFeeKobo / 100);

  useEffect(() => {
    if (!ref) return;

    Promise.all([
      fetch('/api/member/me', { cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok || !data.success) throw new Error(response.status === 401 ? 'Sign in to continue with your registration payment.' : data.error || 'Your registration payment could not be loaded.'); return data.member; }),
      fetch('/api/bank-account').then(r => r.json()).catch(() => null),
    ]).then(([memberData, bankData]) => {
      if (!memberData.profileComplete || memberData.applicationRef !== ref) throw new Error('Complete and save your registration form, then open its payment tab in your dashboard.');
      setApplicantName(memberData.fullName || '');
      setEmail(memberData.email);
      setRegistrationFeeKobo(memberData.registrationFeeKobo || 200_000);
      setAlreadyPaid(memberData.paymentStatus === 'paid');
      setCanPay(memberData.paymentStatus !== 'paid');
      if (bankData?.success && bankData.account) {
        setBankAccount(bankData.account);
      }
    }).catch(reason => setError(reason instanceof Error ? reason.message : 'Your payment details could not be loaded.')).finally(() => setFetching(false));
  }, [ref]);

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(''), 2000);
    });
  }

  async function handlePay() {
    if (!ref || !canPay) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationRef: ref, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize payment');
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  if (!ref) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 mb-4">Invalid payment link — no application reference found.</p>
        <Link href="/register" className="text-[#1a472a] font-semibold hover:underline">Go to Registration</Link>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a472a]" />
      </div>
    );
  }

  if (!canPay && !alreadyPaid) return <div className="space-y-4 py-8 text-center"><p role="alert" className="text-sm text-red-800">{error || 'Your registration payment is unavailable.'}</p><Link href="/members/dashboard?tab=registration-payment" className="font-semibold text-[#1a472a] underline">Return to registration payment</Link></div>;

  if (alreadyPaid) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[#121417]">Already Paid</h2>
        <p className="text-neutral-600">Your membership fee has been received and your saved form was submitted automatically.</p>
        <Link
          href="/members/dashboard?tab=application"
          className="inline-flex items-center gap-2 rounded-full bg-[#1a472a] px-8 py-3 text-sm font-semibold text-white hover:bg-[#2d5f3f] transition-all"
        >
          Check Application Status <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Amount banner */}
      <div className="rounded-2xl bg-[#1a472a] px-6 py-7 text-center text-white"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        <p className="text-xs text-white/60 uppercase tracking-widest font-semibold mb-1">Membership Fee</p>
        <p className="text-5xl font-bold">{amountFormatted}</p>
        <p className="text-xs text-white/60 mt-1.5">One-time registration fee</p>
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm leading-6 text-black"><p className="font-semibold">{applicantName ? `${applicantName}, your form is saved.` : 'Your form is saved.'}</p><p className="mt-1">It will be submitted automatically when your registration payment is confirmed.</p><Link href="/members/dashboard?tab=edit-form" className="mt-2 inline-block font-semibold underline">Edit saved form</Link></div>

      {/* Application ref */}
      <div className="rounded-2xl bg-white border border-neutral-100 px-5 py-3 flex items-center justify-between">
        <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Application Ref</span>
        <span className="text-xs font-bold text-[#1a472a] font-mono truncate max-w-[55%]">{ref}</span>
      </div>

      {/* Payment method tabs */}
      <div className="flex rounded-2xl bg-neutral-100 p-1 gap-1">
        <button
          onClick={() => setActiveTab('paystack')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'paystack'
              ? 'bg-white text-[#121417] shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <CreditCard className="h-4 w-4" /> Pay Online
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'transfer'
              ? 'bg-white text-[#121417] shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Building2 className="h-4 w-4" /> Bank Transfer
        </button>
      </div>

      {/* Paystack tab */}
      {activeTab === 'paystack' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-6 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Secured by Paystack
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-neutral-400" /> Cards, Transfer & USSD
            </span>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full h-12 rounded-full bg-[#1a472a] text-white font-semibold text-sm hover:bg-[#2d5f3f] transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#1a472a]/20"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to Paystack...</>
              : <>Pay {amountFormatted} Now <ArrowRight className="h-4 w-4" /></>
            }
          </button>
          <p className="text-center text-xs text-neutral-400">
            You will be redirected to Paystack&apos;s secure checkout.
          </p>
        </div>
      )}

      {/* Bank transfer tab */}
      {activeTab === 'transfer' && (
        <div className="space-y-4">
          {bankAccount ? (
            <>
              <div className="rounded-2xl bg-white border border-neutral-100 overflow-hidden">
                <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-100">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Transfer Details</p>
                </div>
                {[
                  { label: 'Bank Name', value: bankAccount.bankName, copyKey: 'bank' },
                  { label: 'Account Name', value: bankAccount.accountName, copyKey: 'name' },
                  { label: 'Account Number', value: bankAccount.accountNumber, copyKey: 'number' },
                  ...(bankAccount.sortCode ? [{ label: 'Sort Code', value: bankAccount.sortCode, copyKey: 'sort' }] : []),
                  { label: 'Amount', value: amountFormatted, copyKey: 'amount' },
                ].map(({ label, value, copyKey }) => (
                  <div key={label} className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-50 last:border-0">
                    <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#121417]">{value}</span>
                      <button
                        onClick={() => copyToClipboard(value, copyKey)}
                        className="text-neutral-400 hover:text-[#1a472a] transition-colors"
                        title="Copy"
                      >
                        {copied === copyKey
                          ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                          : <Copy className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 space-y-1.5">
                <p className="text-sm font-semibold text-amber-800">Important — Use as payment reference:</p>
                <p className="text-xs font-mono font-bold text-amber-900 break-all">{ref}</p>
                <p className="text-xs text-amber-700">
                  Include your application reference as the transfer narration/description so we can identify your payment.
                </p>
              </div>

              <div className="rounded-2xl bg-neutral-50 border border-neutral-100 px-5 py-4 text-xs text-neutral-500 space-y-1">
                <p className="font-semibold text-neutral-600">After transferring:</p>
                <p>An admin will check the bank statement and confirm your payment. Your saved form is then submitted automatically for review. You can check payment status in your dashboard.</p>
              </div>

              <Link
                href="/members/dashboard?tab=registration-payment"
                className="w-full h-11 flex items-center justify-center gap-2 rounded-full border-2 border-[#1a472a] text-[#1a472a] font-semibold text-sm hover:bg-[#1a472a] hover:text-white transition-all active:scale-95"
              >
                View payment status
              </Link>
            </>
          ) : (
            <div className="rounded-2xl bg-neutral-50 border border-neutral-100 px-6 py-8 text-center">
              <Building2 className="h-8 w-8 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-neutral-600">Bank details not available</p>
              <p className="text-xs text-neutral-400 mt-1">Please use the online payment option or contact us at <a href="mailto:oldstudentsassociation94@gmail.com" className="text-[#1a472a] hover:underline">oldstudentsassociation94@gmail.com</a></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-[#ECEBE6] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-[#F6F5F0] rounded-3xl border border-white/60 shadow-2xl shadow-black/10 overflow-hidden">
        <div className="bg-[#F6F5F0] border-b border-neutral-100 px-8 py-6 flex items-center gap-3">
          <Image src="/logo.png" alt="RSSSOSAA" width={36} height={36} className="object-contain" />
          <div>
            <p className="text-sm font-bold text-[#121417]">RSSSOSAA</p>
            <p className="text-xs text-neutral-500">Complete your membership payment</p>
          </div>
        </div>

        <div className="px-8 py-8">
          <Suspense fallback={
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#1a472a]" />
            </div>
          }>
            <PaymentContent />
          </Suspense>
        </div>
      </div>

      <p className="mt-6 text-sm text-neutral-500">
        <Link href="/" className="hover:text-[#1a472a] transition-colors">← Back to home</Link>
      </p>
    </div>
  );
}
