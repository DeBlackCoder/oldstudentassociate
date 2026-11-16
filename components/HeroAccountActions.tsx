'use client';

import Link from 'next/link';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173f26] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F5F0]';
const buttonBase = `group inline-flex h-12 w-full max-w-sm select-none items-center justify-center gap-2 rounded-full px-6 text-base font-semibold touch-manipulation [-webkit-tap-highlight-color:transparent] transition-all duration-300 ease-out active:scale-[0.98] motion-reduce:transition-none md:h-14 md:w-auto md:max-w-[260px] md:min-w-0 md:flex-1 md:basis-[200px] md:px-8 md:text-lg md:hover:-translate-y-0.5 ${focusRing}`;
const primaryButton = `${buttonBase} bg-[#173f26] text-white shadow-[0_10px_24px_-10px_rgba(23,63,38,0.7)] hover:bg-[#1f5233] hover:shadow-[0_14px_28px_-10px_rgba(23,63,38,0.75)]`;

export default function HeroAccountActions() {
  const pathname = usePathname();
  const [session, setSession] = useState<'loading' | 'signed-in' | 'signed-out'>('loading');

  useEffect(() => {
    let controller: AbortController | undefined;
    let disposed = false;

    async function refreshSession() {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch('/api/member/me', {
          credentials: 'include', cache: 'no-store', signal: controller.signal,
        });
        const data = response.ok ? await response.json() : null;
        if (!disposed) setSession(data?.success && data.member ? 'signed-in' : 'signed-out');
      } catch (error) {
        if (!disposed && !(error instanceof DOMException && error.name === 'AbortError')) {
          setSession('signed-out');
        }
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void refreshSession();
    }

    void refreshSession();
    window.addEventListener('focus', refreshSession);
    window.addEventListener('pageshow', refreshSession);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      disposed = true;
      controller?.abort();
      window.removeEventListener('focus', refreshSession);
      window.removeEventListener('pageshow', refreshSession);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [pathname]);

  return <div
    className="hero-rise mx-auto flex w-full max-w-sm flex-col items-center justify-center gap-3 pt-1 md:mx-0 md:mt-2 md:max-w-none md:flex-row md:flex-wrap md:justify-start md:gap-4 md:pt-0"
    style={{ animationDelay: '1050ms' }}
    aria-busy={session === 'loading'}
  >
    {session === 'loading' ? <div className={`${buttonBase} border border-[#173f26]/10 bg-[#173f26]/5 text-[#173f26]`} role="status">Checking your account…</div> : session === 'signed-in' ? <Link href="/members/dashboard" className={primaryButton}>
      <LayoutDashboard aria-hidden className="h-5 w-5" />View dashboard
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d9b86a] text-[#173f26] transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none"><ArrowRight aria-hidden className="h-4 w-4" /></span>
    </Link> : <>
      <Link href="/register" className={primaryButton}>
        Become a member
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d9b86a] text-[#173f26] transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none"><ArrowRight aria-hidden className="h-4 w-4" /></span>
      </Link>
      <Link href="/login" className={`${buttonBase} border-[1.5px] border-[#173f26] bg-white/40 text-[#173f26] hover:bg-[#173f26] hover:text-white md:hover:shadow-lg`}>Already a member</Link>
    </>}
  </div>;
}
