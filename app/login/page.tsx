'use client';

import Link from 'next/link';
import Image from 'next/image';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#ECEBE6] px-4 py-12">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-[#F6F5F0] shadow-2xl shadow-black/10">
        <header className="bg-[#1a472a] px-8 py-8 text-center text-white">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Image src="/logo.png" alt="RSSSOSAA" width={40} height={40} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold">Welcome to RSSSOSAA</h1>
          <p className="mt-1 text-sm text-white/70">Sign in or create your member account</p>
        </header>

        <div className="space-y-6 px-8 py-8">
          <p className="text-center text-sm leading-6 text-neutral-600">
            Continue with Google to access your member dashboard. New members get an account automatically.
          </p>
          <GoogleSignInButton />
          <p className="text-center text-xs text-neutral-500">
            Need help?{' '}
            <a href="mailto:oldstudentassociation94@gmail.com" className="font-medium text-[#1a472a] hover:underline">
              Contact the association
            </a>
          </p>
          <p className="text-center text-xs text-neutral-400">
            Administrator?{' '}
            <Link href="/admin/login" className="font-medium text-[#1a472a] hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
