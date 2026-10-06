'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setLoading(true);
    try {
      const res = await fetch('/api/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsVerification) {
          setNeedsVerification(true);
          setError(data.error);
        } else {
          throw new Error(data.error || 'Login failed');
        }
        return;
      }
      // Admin gets redirected to admin dashboard
      if (data.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/members/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#ECEBE6] lg:bg-white flex items-center justify-center p-4 lg:p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl shadow-black/10 overflow-hidden flex flex-col lg:flex-row min-h-[580px]">

        {/* ── Mobile top image banner ─────────────────────────── */}
        <div
          className="lg:hidden relative h-44 w-full flex-shrink-0"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=900&h=400&fit=crop&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a472a]/60 to-black/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-6 text-center">
            <img src="/logo.png" alt="RSSSOSAA" className="h-12 w-12 object-contain mb-2 drop-shadow-lg" />
            <span className="text-lg font-bold tracking-wide">RSSS<span className="text-emerald-300">OSAA</span></span>
            <p className="text-xs text-white/70 mt-1">Old Students Association</p>
          </div>
        </div>

        {/* ── Left: Form panel ───────────────────────────────────── */}
        <div className="flex flex-col w-full lg:w-[45%] px-6 sm:px-10 py-8 lg:py-10">

          {/* Logo — desktop only */}
          <div className="hidden lg:flex items-center gap-2.5 mb-12">
            <img src="/logo.png" alt="RSSSOSAA" width={32} height={32} className="object-contain" />
            <span className="text-base font-bold text-[#121417]">
              RSSS<span className="text-[#1a472a]">OSAA</span>
            </span>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#121417] mb-2">Hello!</h1>
            <p className="text-sm text-neutral-500 leading-relaxed">
              To log in to your account, enter your email address and password.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Your email address"
              className="w-full h-12 rounded-xl bg-neutral-100 border-0 px-4 text-sm text-[#121417] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1a472a]/30 transition"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Your password"
                className="w-full h-12 rounded-xl bg-neutral-100 border-0 px-4 pr-11 text-sm text-[#121417] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1a472a]/30 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex justify-between items-center -mt-1">
              <Link href="/signup" className="text-xs text-[#1a472a] hover:underline font-medium">
                Forgot Password?
              </Link>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
                {needsVerification && (
                  <> <Link href="/signup" className="font-semibold underline">Verify your email →</Link></>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#121417] text-white font-semibold text-sm hover:bg-[#2a2a2a] transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : 'Next step'}
            </button>

            <div className="mt-auto pt-6 text-center space-y-1">
              <p className="text-xs text-neutral-400">
                Don&apos;t hesitate to contact us at{' '}
                <a href="mailto:oldstudentassociation7@gmail.com" className="text-[#1a472a] hover:underline">
                  oldstudentassociation7@gmail.com
                </a>
              </p>
              <p className="text-xs text-neutral-400">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-[#1a472a] hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </form>

          <p className="text-[10px] text-neutral-300 text-center mt-4">
            All rights reserved RSSSOSAA {new Date().getFullYear()}
          </p>
        </div>

        {/* ── Right: Image panel — desktop only ──────────────────── */}
        <div className="hidden lg:flex relative flex-1 overflow-hidden flex-col justify-end"
          style={{
            backgroundImage: `linear-gradient(135deg, #1a472a 0%, #2d5f3f 40%, #0f2918 100%), url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=900&fit=crop&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundBlendMode: 'multiply',
          }}
        >
          {/* Dot texture */}
          <div className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          {/* Top branding */}
          <div className="relative px-8 pt-10">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center">
                <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
              </div>
              <span className="text-white/80 text-sm font-semibold tracking-wide">RSSSOSAA</span>
            </div>
          </div>

          {/* Glass card */}
          <div className="relative m-8 mt-auto rounded-2xl px-6 py-5 text-white"
            style={{
              background: 'rgba(255,255,255,0.10)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            <div className="flex items-center gap-2 mb-3 opacity-60">
              <svg className="h-4 w-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-xs text-white/60 uppercase tracking-widest font-semibold">Members Portal</span>
            </div>
            <p className="text-xl font-bold leading-snug mb-2 text-white">
              Connecting Rivers State alumni across generations
            </p>
            <p className="text-sm text-white/70 leading-relaxed">
              Join thousands of old students building a stronger network for education, welfare, and community development.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
