'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import AccountRecoveryCard from './AccountRecoveryCard';

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const validLink = /^[a-f\d]{64}$/.test(token);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (new TextEncoder().encode(password).length > 72) { setError('Use a shorter password: the limit is 72 UTF-8 bytes.'); return; }
    setLoading(true);
    try {
      const response = await fetch('/api/member/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update your password. Try again.');
      setPassword(''); setConfirmPassword(''); setMessage(data.message);
      window.history.replaceState(null, '', '/reset-password');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update your password. Try again.');
    } finally { setLoading(false); }
  }

  return (
    <AccountRecoveryCard title="Choose a new password" description="Use a password with at least 8 characters. After updating it, sign in again to continue.">
      {!validLink ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          This reset link is missing or invalid.
          <Link href="/forgot-password" className="mt-2 block font-semibold underline">Request a new reset link</Link>
        </div>
      ) : message ? (
        <div role="status" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <CheckCircle2 size={25} className="mb-3 text-emerald-700" aria-hidden="true" />
          <h2 className="text-base font-semibold text-emerald-950">Password updated</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-900">{message}</p>
          <Link href="/admin/login" className="mt-4 flex h-11 items-center justify-center rounded-xl bg-[#173e2c] text-sm font-semibold text-white">Administrator sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-neutral-800">New password</label>
            <div className="relative">
              <input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={event => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 pr-12 text-sm text-neutral-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-4 top-3.5 text-neutral-500 hover:text-emerald-800">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-neutral-800">Confirm new password</label>
            <input id="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={72} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" />
          </div>
          {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}<Link href="/forgot-password" className="mt-2 block font-semibold underline">Request a new reset link</Link></div>}
          <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173e2c] text-sm font-semibold text-white transition hover:bg-[#22583e] disabled:opacity-60">
            {loading && <Loader2 size={17} className="animate-spin" aria-hidden="true" />} {loading ? 'Updating password…' : 'Update password'}
          </button>
        </form>
      )}
    </AccountRecoveryCard>
  );
}
