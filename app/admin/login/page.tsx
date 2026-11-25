'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to sign in.');
      router.replace('/admin/dashboard');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#ECEBE6] px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-8 shadow-2xl shadow-black/10">
        <div className="mb-6 flex items-center gap-3">
          <Image src="/logo.png" alt="RSSSOSAA" width={40} height={40} className="object-contain" />
          <div>
            <h1 className="text-xl font-bold text-[#121417]">Administrator sign in</h1>
            <p className="text-sm text-neutral-500">Authorized staff only</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-neutral-700">Email address</label>
            <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-[#1a472a] focus:ring-2 focus:ring-[#1a472a]/15" />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-neutral-700">Password</label>
            <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-[#1a472a] focus:ring-2 focus:ring-[#1a472a]/15" />
          </div>
          {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1a472a] text-sm font-semibold text-white hover:bg-[#2d5f3f] disabled:opacity-60">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <Link href="/forgot-password" className="mt-4 block text-center text-sm font-medium text-[#1a472a] hover:underline">
          Forgot administrator password?
        </Link>
        <Link href="/login" className="mt-6 block text-center text-sm text-neutral-500 hover:text-[#1a472a]">
          Back to member sign in
        </Link>
      </section>
    </main>
  );
}
