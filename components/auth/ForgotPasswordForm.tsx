'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import AccountRecoveryCard from './AccountRecoveryCard';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await fetch('/api/member/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not request a reset link. Try again.');
      setMessage(data.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not request a reset link. Try again.');
    } finally { setLoading(false); }
  }

  return (
    <AccountRecoveryCard title="Forgot your administrator password?" description="Enter your administrator account email and we’ll send a link to choose a new password.">
      {message ? (
        <div role="status" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <CheckCircle2 size={25} className="mb-3 text-emerald-700" aria-hidden="true" />
          <h2 className="text-base font-semibold text-emerald-950">Check your email</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-900">{message}</p>
          <p className="mt-3 text-xs leading-5 text-emerald-800">Links expire after 30 minutes. Wait at least one minute before requesting another link.</p>
          <button type="button" onClick={() => setMessage('')} className="mt-4 text-sm font-semibold text-emerald-900 underline">Request another link</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="recovery-email" className="mb-2 block text-sm font-medium text-neutral-800">Email address</label>
            <div className="relative">
              <Mail size={18} className="pointer-events-none absolute left-4 top-3.5 text-neutral-400" aria-hidden="true" />
              <input id="recovery-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-11 pr-4 text-sm text-neutral-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" />
            </div>
          </div>
          {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173e2c] text-sm font-semibold text-white transition hover:bg-[#22583e] disabled:opacity-60">
            {loading && <Loader2 size={17} className="animate-spin" aria-hidden="true" />} {loading ? 'Sending request…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AccountRecoveryCard>
  );
}
