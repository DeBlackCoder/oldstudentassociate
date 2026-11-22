'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

type Screen = 'signup' | 'verify';

export default function SignupPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('signup');

  // Signup form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [devCode, setDevCode] = useState('');

  // Verify form state
  const [code, setCode] = useState(['', '', '', '']);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const digitRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError('');
    if (password.length < 8) { setSignupError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setSignupError('Passwords do not match.'); return; }
    setSignupLoading(true);
    try {
      const res = await fetch('/api/member/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      if (data.devCode) setDevCode(data.devCode);
      setScreen('verify');
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSignupLoading(false);
    }
  }

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    if (digit && index < 3) digitRefs[index + 1].current?.focus();
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      digitRefs[index - 1].current?.focus();
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError('');
    const fullCode = code.join('');
    if (fullCode.length !== 4) { setVerifyError('Please enter all 4 digits.'); return; }
    setVerifyLoading(true);
    try {
      const res = await fetch('/api/member/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      router.push('/members/dashboard');
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Something went wrong');
      setVerifyLoading(false);
    }
  }

  async function handleResend() {
    setVerifyError('');
    try {
      const res = await fetch('/api/member/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not resend the verification code.');
      if (data.devCode) setDevCode(data.devCode);
      setCode(['', '', '', '']);
      digitRefs[0].current?.focus();
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Could not resend the verification code.');
    }
  }

  return (
    <div className="min-h-screen bg-[#ECEBE6] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-[#F6F5F0] rounded-3xl border border-white/60 shadow-2xl shadow-black/10 overflow-hidden">

        {/* Green header */}
        <div className="bg-[#1a472a] px-8 py-8 text-center"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 mb-3">
            <Image src="/logo.png" alt="RSSSOSAA" width={40} height={40} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold text-white">
            {screen === 'signup' ? 'Create Account' : 'Verify Your Email'}
          </h1>
          <p className="text-sm text-white/70 mt-1">
            {screen === 'signup' ? 'Join RSSSOSAA today' : `We sent a code to ${email}`}
          </p>
        </div>

        <div className="px-8 py-8">
          {screen === 'signup' ? (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#121417] block">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a472a]/20 focus:border-[#1a472a]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#121417] block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="At least 8 characters"
                    className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-4 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a472a]/20 focus:border-[#1a472a]"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#121417] block">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter your password"
                    className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-4 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a472a]/20 focus:border-[#1a472a]"
                  />
                  <button type="button" onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {signupError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{signupError}</div>
              )}

              <button type="submit" disabled={signupLoading}
                className="w-full h-11 rounded-full bg-[#1a472a] text-white font-semibold text-sm hover:bg-[#2d5f3f] transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
                {signupLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
              </button>

              <p className="text-center text-sm text-neutral-500">
                Already have an account?{' '}
                <Link href="/login" className="text-[#1a472a] font-semibold hover:underline">Sign in</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="text-center text-sm text-neutral-600">
                Enter the 4-digit code sent to <span className="font-semibold text-[#121417]">{email}</span>
              </div>

              {/* 4 digit boxes */}
              <div className="flex justify-center gap-3">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={digitRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    className="w-14 h-14 rounded-2xl border-2 border-neutral-200 bg-white text-center text-2xl font-bold text-[#121417] focus:outline-none focus:border-[#1a472a] focus:ring-2 focus:ring-[#1a472a]/20 transition-all"
                  />
                ))}
              </div>

              {/* Dev mode: show code */}
              {devCode && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 text-center flex items-center justify-center gap-2">
                  <span>Dev mode — code: <strong className="font-mono text-lg">{devCode}</strong></span>
                </div>
              )}

              {verifyError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">{verifyError}</div>
              )}

              <button type="submit" disabled={verifyLoading || code.join('').length !== 4}
                className="w-full h-11 rounded-full bg-[#1a472a] text-white font-semibold text-sm hover:bg-[#2d5f3f] transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
                {verifyLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <>Verify Email <CheckCircle className="h-4 w-4" /></>}
              </button>

              <p className="text-center text-sm text-neutral-500">
                Didn&apos;t receive a code?{' '}
                <button type="button" onClick={handleResend} className="text-[#1a472a] font-semibold hover:underline">Resend code</button>
              </p>

              <p className="text-center text-sm text-neutral-500">
                Wrong email?{' '}
                <button type="button" onClick={() => setScreen('signup')} className="text-[#1a472a] font-semibold hover:underline">Go back</button>
              </p>
            </form>
          )}
        </div>
      </div>

      <p className="mt-5 text-sm text-neutral-400">
        <Link href="/" className="hover:text-[#1a472a]">← Back to home</Link>
      </p>
    </div>
  );
}
