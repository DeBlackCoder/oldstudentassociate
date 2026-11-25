'use client';

import { useState, useSyncExternalStore } from 'react';
import { getProviders, signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

const OAUTH_ERROR = 'Google sign-in could not be completed. Please try again.';

function subscribeToLocation(callback: () => void) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

function getOAuthError() {
  return new URLSearchParams(window.location.search).has('error') ? OAUTH_ERROR : '';
}

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const oauthError = useSyncExternalStore(subscribeToLocation, getOAuthError, () => '');

  async function handleSignIn() {
    setLoading(true);
    setError('');
    try {
      const providers = await getProviders();
      if (!providers?.google) {
        setError('Google sign-in is not configured yet. Please contact the association for help.');
        return;
      }

      const result = await signIn('google', { redirect: false, redirectTo: '/members/dashboard' });
      if (!result?.ok || !result.url) {
        setError('Google sign-in could not be started. Please try again.');
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError('Google sign-in is temporarily unavailable. Please try again or contact the association.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-[#121417] transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span aria-hidden="true" className="text-lg font-bold text-[#4285F4]">G</span>}
        Continue with Google
      </button>
      <p className="text-center text-xs text-neutral-500">Click here to continue.</p>
      {(error || oauthError) && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-700">{error || oauthError}</p>}
    </div>
  );
}
