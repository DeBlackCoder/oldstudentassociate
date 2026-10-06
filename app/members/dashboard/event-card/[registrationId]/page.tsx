'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

interface EventCardData {
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  fullName: string;
  membershipNumber: string;
  eventCardRef: string;
}

export default function EventCardPage() {
  const { registrationId } = useParams<{ registrationId: string }>();
  const [cardData, setCardData] = useState<EventCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!registrationId) return;
    fetch(`/api/member/event-card/${registrationId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setCardData(data);
        } else {
          setError(data.error || 'Unable to load event card.');
        }
      })
      .catch(() => setError('Failed to load event card. Please try again.'))
      .finally(() => setLoading(false));
  }, [registrationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECEBE6] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a472a]" />
      </div>
    );
  }

  if (error || !cardData) {
    return (
      <div className="min-h-screen bg-[#ECEBE6] flex items-center justify-center px-4">
        <div className="rounded-3xl bg-[#F6F5F0] border border-white/60 shadow-xl shadow-black/5 p-8 text-center max-w-sm w-full">
          <p className="font-bold text-[#121417] mb-2">Event Card Unavailable</p>
          <p className="text-sm text-neutral-600 mb-6">{error || 'This event card could not be loaded.'}</p>
          <Link
            href="/members/dashboard?tab=events"
            className="inline-flex items-center gap-2 rounded-full bg-[#1a472a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2d5f3f] transition-all"
          >
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(cardData.eventDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#ECEBE6] flex items-center justify-center px-4 py-16">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body > * { display: none !important; }
          #event-card-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
      ` }} />

      <div className="max-w-sm w-full space-y-5">
        {/* Back link */}
        <Link
          href="/members/dashboard?tab=events"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-[#1a472a] transition-colors"
        >
          ← Back to Events
        </Link>

        {/* Event card */}
        <div
          id="event-card-print"
          className="rounded-3xl bg-[#1a472a] p-6 text-white space-y-4"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="RSSSOSAA" width={32} height={32} className="object-contain opacity-90" />
            <div>
              <p className="text-[10px] text-white/60 uppercase tracking-widest">RSSSOSAA</p>
              <p className="text-xs font-semibold text-white/80">Event Registration Card</p>
            </div>
          </div>

          {/* Event info */}
          <div className="border-t border-white/10 pt-4">
            <p className="text-xl font-bold leading-tight mb-2">{cardData.eventTitle}</p>
            <p className="text-sm text-white/70">{formattedDate}</p>
            <p className="text-sm text-white/50 mt-0.5">{cardData.eventLocation}</p>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Member info */}
          <div className="space-y-2.5">
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wide">Registered Member</p>
              <p className="text-sm font-semibold">{cardData.fullName}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wide">Membership No.</p>
              <p className="text-sm font-mono font-bold tracking-widest">{cardData.membershipNumber}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-wide">Event Card Ref</p>
              <p className="text-sm font-mono font-bold text-emerald-300 tracking-wider">{cardData.eventCardRef}</p>
            </div>
          </div>
        </div>

        {/* Print button */}
        <button
          onClick={() => window.print()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#1a472a] px-5 py-2.5 text-sm font-bold text-[#1a472a] hover:bg-[#1a472a] hover:text-white transition-all active:scale-95"
        >
          Print / Save
        </button>
      </div>
    </div>
  );
}
