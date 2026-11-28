'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

const LAST_EMAIL_KEY = 'rsssosaa_last_email';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const [lastEmail, setLastEmail] = useState<string | null>(null);

  // On mount, read the last-used email from localStorage.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_EMAIL_KEY);
      if (stored) setLastEmail(stored);
    } catch {
      // localStorage unavailable (e.g. private browsing with strict settings)
    }
  }, []);

  // If the user lands on the login page while already authenticated
  // (e.g. navigated back), save their email so it persists for the next login.
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      try {
        localStorage.setItem(LAST_EMAIL_KEY, session.user.email);
        setLastEmail(session.user.email);
      } catch {
        // ignore
      }
    }
  }, [status, session]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#ECEBE6] px-4 py-12">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-[#F6F5F0] shadow-2xl shadow-black/10">
        <header className="bg-[#1a472a] px-8 py-8 text-center text-white">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Image src="/logo.png" alt="RSSSOSAA" width={40} height={40} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold">Welcome to RSSSOSAA</h1>
          <p className="mt-1 text-sm text-white/70">One secure sign-in for members and administrators</p>
        </header>

        <div className="space-y-6 px-8 py-8">
          {lastEmail && (
            <p className="rounded-xl bg-[#1a472a]/5 px-4 py-2.5 text-center text-sm text-neutral-700">
              Last signed in as <span className="font-medium text-[#1a472a]">{lastEmail}</span>
            </p>
          )}
          <p className="text-center text-sm leading-6 text-neutral-600">
            Continue with Google. New members get an account automatically, and administrators with assigned access are taken to the admin dashboard.
          </p>
          <GoogleSignInButton />
          <p className="text-center text-xs text-neutral-500">
            Need help?{' '}
            <a href="mailto:oldstudentsassociation94@gmail.com" className="font-medium text-[#1a472a] hover:underline">
              Contact the association
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
