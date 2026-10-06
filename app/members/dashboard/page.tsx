'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import {
  ArrowRight, CheckCircle, Clock, CreditCard,
  FileText, IdCard, Loader2, Lock, XCircle,
} from 'lucide-react';

interface MemberData {
  id: string;
  email: string;
  profileComplete: boolean;
  fullName?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  paymentStatus: 'unpaid' | 'paid' | 'failed';
  membershipNumber?: string;
  applicationRef?: string;
  secondarySchool?: string;
  graduationYear?: number;
  submittedAt?: string;
  paidAt?: string;
}

interface EventItem {
  _id: string;
  title: string;
  date: string;
  location: string;
  registrationFee: number;
  isFree: boolean;
  isRegistered: boolean;
  registrationId?: string;
  paymentStatus?: string;
}

type Tab = 'overview' | 'application' | 'events' | 'members' | 'benefits';

function MemberDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return (['overview','application','events','members','benefits'].includes(t || '') ? t : 'overview') as Tab;
  });
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Sync tab from URL
  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if (t && ['overview','application','events','members','benefits'].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const switchTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
    // Dispatch a custom event so Navbar can react
    window.dispatchEvent(new CustomEvent('dashboard-tab-change', { detail: tab }));
  }, []);

  useEffect(() => {
    fetch('/api/member/me')
      .then(r => {
        if (r.status === 401) { router.push('/login'); return null; }
        return r.json();
      })
      .then(data => {
        if (data?.success) setMember(data.member);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (activeTab !== 'events') return;
    setEventsLoading(true);
    fetch('/api/member/events')
      .then(r => r.json())
      .then(data => {
        if (data?.success) setEvents(data.events || []);
      })
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, [activeTab]);

  async function handleLogout() {
    await fetch('/api/member/logout', { method: 'POST' });
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECEBE6] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a472a]" />
      </div>
    );
  }

  if (!member) return null;

  const isPaid = member.paymentStatus === 'paid';
  const isApproved = member.status === 'Approved';
  const isRejected = member.status === 'Rejected';
  const profileComplete = member.profileComplete;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'application', label: 'My Application' },
    { id: 'events', label: 'Activities & Events' },
    { id: 'members', label: 'Members' },
    { id: 'benefits', label: 'Benefits' },
  ];

  /* ── Status badge ─────────────────────────────────────────────── */
  const statusBadge = isApproved
    ? <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1">Approved</span>
    : isRejected
    ? <span className="rounded-full bg-red-100 text-red-700 text-xs font-semibold px-3 py-1">Rejected</span>
    : <span className="rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1">Pending</span>;

  /* ── Form incomplete banner (shown at top of every tab) ─────── */
  const FormIncompleteBanner = () => !profileComplete ? (
    <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 mb-5">
      <FileText className="h-5 w-5 text-amber-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">Registration form not filled</p>
        <p className="text-xs text-amber-700 mt-0.5">Complete your membership form to activate your application.</p>
      </div>
      <Link
        href="/register"
        className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition-all"
      >
        Fill Form <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  ) : null;

  /* ── Tab content ──────────────────────────────────────────────── */
  const renderTabContent = () => {
    switch (activeTab) {

      /* OVERVIEW ─────────────────────────────────────────────────── */
      case 'overview': return (
        <div className="space-y-5">
          <FormIncompleteBanner />
          {/* Status summary */}
          <div className="rounded-3xl bg-[#F6F5F0] border border-white/60 shadow-xl shadow-black/5 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[#121417]">{member.fullName || member.email}</p>
                <p className="text-xs text-neutral-500">{member.email}</p>
              </div>
              {statusBadge}
            </div>
          </div>

          {/* State A: Profile incomplete */}
          {!profileComplete && (
            <div className="rounded-3xl bg-[#1a472a] px-6 py-7 text-white"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg">Complete Your Profile</p>
                  <p className="text-sm text-white/70 mt-1 mb-4">
                    Fill in your personal, school, and professional information to activate your membership application.
                  </p>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[#1a472a] hover:bg-white/90 transition-all active:scale-95"
                  >
                    Fill Registration Form <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 opacity-40 pointer-events-none">
                {['Payment', 'Review', 'Membership Card'].map(s => (
                  <div key={s} className="rounded-xl bg-white/10 px-3 py-3 text-center text-xs font-semibold text-white/70">
                    <Lock className="h-3.5 w-3.5 mx-auto mb-1.5 opacity-70" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* State B: Profile done, not paid */}
          {profileComplete && !isPaid && !isApproved && (
            <div className="rounded-3xl bg-amber-500 px-6 py-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="h-6 w-6 flex-shrink-0" />
                <div>
                  <p className="font-bold">Payment Required</p>
                  <p className="text-sm text-white/80">Pay your membership fee to submit your application for review.</p>
                </div>
              </div>
              <Link
                href={`/register/payment?ref=${encodeURIComponent(member.applicationRef || '')}`}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-amber-700 hover:bg-white/90 transition-all"
              >
                Pay ₦2,000 Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* State C: Paid, under review */}
          {profileComplete && isPaid && !isApproved && !isRejected && (
            <div className="rounded-3xl bg-blue-600 px-6 py-6 text-white flex items-center gap-4">
              <Clock className="h-7 w-7 flex-shrink-0" />
              <div>
                <p className="font-bold">Application Pending Admin Approval</p>
                <p className="text-sm text-white/80">Your application is pending admin approval. We&apos;ll notify you once reviewed.</p>
              </div>
            </div>
          )}

          {/* State D: Approved */}
          {isApproved && (
            <div className="rounded-3xl bg-[#1a472a] px-6 py-6 text-white flex items-center gap-4"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
              <CheckCircle className="h-7 w-7 flex-shrink-0 text-emerald-300" />
              <div>
                <p className="font-bold text-lg">Active Member</p>
                <p className="text-sm text-white/70">Your membership is active and verified.</p>
              </div>
            </div>
          )}

          {/* Rejected */}
          {isRejected && (
            <div className="rounded-3xl bg-red-600 px-6 py-6 text-white flex items-center gap-4">
              <XCircle className="h-7 w-7 flex-shrink-0" />
              <div>
                <p className="font-bold">Application Not Approved</p>
                <p className="text-sm text-white/80">Please contact us for more information.</p>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="rounded-3xl bg-[#F6F5F0] border border-white/60 shadow-xl shadow-black/5 p-6 space-y-3">
            <h2 className="font-bold text-[#121417] mb-1">Quick Actions</h2>
            <Link href="/contact"
              className="flex items-center justify-between rounded-2xl bg-white border border-neutral-100 px-5 py-4 hover:border-[#1a472a]/30 transition-all group">
              <span className="text-sm font-semibold text-[#121417]">Contact Support</span>
              <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-[#1a472a] transition-colors" />
            </Link>
            <Link href="/verify-member"
              className="flex items-center justify-between rounded-2xl bg-white border border-neutral-100 px-5 py-4 hover:border-[#1a472a]/30 transition-all group">
              <span className="text-sm font-semibold text-[#121417]">Verify a Membership</span>
              <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-[#1a472a] transition-colors" />
            </Link>
          </div>
        </div>
      );

      /* MY APPLICATION ────────────────────────────────────────────── */
      case 'application': {
        return (
          <div className="space-y-5">
            <FormIncompleteBanner />
            <div className="rounded-3xl bg-[#F6F5F0] border border-white/60 shadow-xl shadow-black/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100">
                <h2 className="font-bold text-[#121417]">Application Details</h2>
              </div>
              <div className="divide-y divide-neutral-100">
                {[
                  { label: 'Application Ref', value: member.applicationRef || '—' },
                  { label: 'Status', value: member.status },
                  { label: 'Payment', value: isPaid ? 'Paid ✓' : 'Unpaid' },
                  ...(member.secondarySchool ? [{ label: 'School', value: member.secondarySchool }] : []),
                  ...(member.graduationYear ? [{ label: 'Graduation Year', value: String(member.graduationYear) }] : []),
                  ...(member.submittedAt ? [{ label: 'Submitted', value: new Date(member.submittedAt).toLocaleDateString('en-GB') }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-6 py-3.5">
                    <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide">{label}</span>
                    <span className="text-sm font-semibold text-[#121417]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Membership card — approved only */}
            {isApproved && member.membershipNumber && (
              <div className="rounded-3xl bg-[#F6F5F0] border border-white/60 shadow-xl shadow-black/5 p-6">
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    body > * { display: none !important; }
                    #membership-card-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
                  }
                ` }} />
                <div className="flex items-center gap-2 mb-4">
                  <IdCard className="h-5 w-5 text-[#1a472a]" />
                  <h2 className="font-bold text-[#121417]">Membership Card</h2>
                </div>
                <div id="membership-card-print"
                  className="rounded-2xl bg-[#1a472a] p-5 text-white space-y-3"
                  style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
                  <div className="flex items-center gap-3">
                    <Image src="/logo.png" alt="RSSSOSAA" width={30} height={30} className="object-contain opacity-90" />
                    <div>
                      <p className="text-[10px] text-white/60 uppercase tracking-widest">RSSSOSAA</p>
                      <p className="text-xs font-semibold text-white/80">Old Students Association</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wide">Membership Number</p>
                    <p className="text-xl font-bold tracking-widest font-mono">{member.membershipNumber}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-white/60">Full Name</p>
                      <p className="text-sm font-semibold">{member.fullName}</p>
                    </div>
                    {member.secondarySchool && (
                      <div className="text-right">
                        <p className="text-xs text-white/60">School</p>
                        <p className="text-xs font-semibold max-w-[140px] text-right">{member.secondarySchool}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-end pt-1">
                    <div>
                      <p className="text-xs text-white/60">Member Since</p>
                      <p className="text-sm font-semibold">
                        {new Date(member.paidAt || member.submittedAt || '').getFullYear() || '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-white/50 mb-1">Scan to Verify</p>
                      <div className="grid grid-cols-6 gap-0.5">
                        {Array.from({ length: 36 }).map((_, i) => (
                          <div key={i} className="h-1.5 w-1.5 rounded-sm bg-white/40" />
                        ))}
                      </div>
                      <p className="text-[8px] text-white/30 mt-1">/verify-member</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => window.print()}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#1a472a] px-5 py-2.5 text-sm font-bold text-[#1a472a] hover:bg-[#1a472a] hover:text-white transition-all active:scale-95"
                >
                  Download Card
                </button>
              </div>
            )}
          </div>
        );
      }

      /* ACTIVITIES & EVENTS ───────────────────────────────────────── */
      case 'events': {
        if (eventsLoading) {
          return (
            <div className="space-y-4">
              <FormIncompleteBanner />
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#1a472a]" />
              </div>
            </div>
          );
        }

        if (events.length === 0) {
          return (
            <div className="space-y-4">
              <FormIncompleteBanner />
              <div className="rounded-3xl bg-[#F6F5F0] border border-white/60 shadow-xl shadow-black/5 p-8 text-center">
                <p className="font-bold text-[#121417] mb-2">No events yet</p>
                <p className="text-sm text-neutral-600">No events published yet. Check back soon.</p>
              </div>
            </div>
          );
        }

        if (events.length === 0) {
          return (
            <div className="rounded-3xl bg-[#F6F5F0] border border-white/60 shadow-xl shadow-black/5 p-8 text-center">
              <p className="font-bold text-[#121417] mb-2">No events yet</p>
              <p className="text-sm text-neutral-600">No events published yet. Check back soon.</p>
            </div>
          );
        }

        async function handleRegister(eventId: string, isFree: boolean) {
          const res = await fetch(`/api/member/events/${eventId}/register`, { method: 'POST' });
          const data = await res.json();
          if (data.authorizationUrl) {
            window.location.href = data.authorizationUrl;
          } else if (data.success) {
            setEventsLoading(true);
            fetch('/api/member/events')
              .then(r => r.json())
              .then(d => { if (d?.success) setEvents(d.events || []); })
              .catch(() => {})
              .finally(() => setEventsLoading(false));
          }
          void isFree;
        }

        return (
          <div className="space-y-4">
            <FormIncompleteBanner />
            <h2 className="font-bold text-xl text-[#121417]">Activities &amp; Events</h2>
            {events.map(event => {
              const isPaidStatus = event.paymentStatus === 'paid' || event.paymentStatus === 'free';
              const isUnpaid = event.paymentStatus === 'unpaid';
              return (
                <div key={event._id}
                  className="rounded-3xl bg-[#F6F5F0] border border-white/60 shadow-xl shadow-black/5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <p className="font-bold text-[#121417]">{event.title}</p>
                    {event.isRegistered && isPaidStatus && (
                      <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1">
                        Registered ✓
                      </span>
                    )}
                    {event.isRegistered && isUnpaid && (
                      <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1">
                        Payment Pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-700 mb-1">
                    {new Date(event.date).toLocaleDateString('en-GB', {
                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-neutral-500 mb-3">{event.location}</p>
                  <p className="text-sm font-semibold text-[#1a472a] mb-4">
                    {event.isFree ? 'Free' : `₦${(event.registrationFee / 100).toLocaleString()}`}
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {event.isRegistered && isPaidStatus && event.registrationId && (
                      <Link
                        href={`/members/dashboard/event-card/${event.registrationId}`}
                        className="inline-flex items-center gap-2 rounded-full bg-[#1a472a] px-5 py-2 text-sm font-bold text-white hover:bg-[#2d5f3f] transition-all active:scale-95"
                      >
                        View Event Card <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                    {!event.isRegistered && (
                      <button
                        onClick={() => handleRegister(event._id, event.isFree)}
                        className="inline-flex items-center gap-2 rounded-full bg-[#1a472a] px-5 py-2 text-sm font-bold text-white hover:bg-[#2d5f3f] transition-all active:scale-95"
                      >
                        Register <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      /* MEMBERS ────────────────────────────────────────────────────── */
      case 'members': {
        return (
          <div className="space-y-4">
            <FormIncompleteBanner />
            <div className="rounded-3xl bg-[#F6F5F0] border border-white/60 shadow-xl shadow-black/5 p-8">
            <h2 className="font-bold text-xl text-[#121417] mb-2">Member Directory</h2>
            <p className="text-sm text-neutral-600">Browse and connect with fellow alumni across Rivers State.</p>
          </div>
          </div>
        );
      }

      /* BENEFITS ───────────────────────────────────────────────────── */
      case 'benefits': {
        return (
          <div className="space-y-4">
            <FormIncompleteBanner />
            <h2 className="font-bold text-xl text-[#121417]">Member Benefits</h2>            <h2 className="font-bold text-xl text-[#121417]">Member Benefits</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                'Educational Programs',
                'Networking Events',
                'Welfare Support',
                'Community Service',
                'Annual Reunions',
                'Skills Training',
              ].map(benefit => (
                <div key={benefit} className="rounded-2xl bg-[#F6F5F0] border border-neutral-100 p-4">
                  <p className="text-sm font-bold text-[#121417]">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#ECEBE6] flex flex-col">

      {/* ── Fixed dashboard header ─────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-200 shadow-sm">

        {/* Main bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 h-14">

          {/* LEFT — Logo + site name */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.png" alt="RSSSOSAA" width={32} height={32} className="object-contain" />
            <div className="flex flex-col leading-tight">
              <span className="text-[#1a472a] text-[11px] font-bold tracking-widest uppercase">RSSSOSAA</span>
              <span className="text-neutral-400 text-[9px] tracking-wide hidden sm:block">Old Students Association</span>
            </div>
          </Link>

          {/* CENTER — Tabs (desktop only) */}
          <nav className="hidden sm:flex items-center gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#1a472a] text-white'
                    : 'text-neutral-500 hover:text-[#1a472a] hover:bg-[#1a472a]/8'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* RIGHT — Profile + status (desktop) + hamburger (mobile) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop: status badge + name + avatar */}
            <div className="hidden sm:flex items-center gap-2">
              {statusBadge}
              <span className="text-sm font-medium text-neutral-600 truncate max-w-[140px]">
                {member.fullName || member.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-neutral-400 hover:text-red-500 border border-neutral-200 rounded-full px-3 py-1.5 transition-colors"
              >
                Sign out
              </button>
            </div>

            {/* Mobile: avatar + hamburger */}
            <div className="flex sm:hidden items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#1a472a] flex items-center justify-center text-white text-xs font-bold">
                {(member.fullName || member.email || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="h-9 w-9 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-neutral-200"
                aria-label="Menu"
              >
                <span className={`block h-0.5 w-5 bg-neutral-600 rounded transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block h-0.5 w-5 bg-neutral-600 rounded transition-all ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 w-5 bg-neutral-600 rounded transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-neutral-100 bg-white">
            {/* User info + status */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
              <div className="h-9 w-9 rounded-full bg-[#1a472a] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(member.fullName || member.email || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#121417] truncate">{member.fullName || member.email}</p>
                <p className="text-xs text-neutral-400 truncate">{member.email}</p>
              </div>
              {statusBadge}
            </div>

            {/* Dashboard tabs */}
            <div className="px-3 py-2 border-b border-neutral-100">
              <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold px-2 py-1">Dashboard</p>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { switchTab(tab.id); setMenuOpen(false); }}
                  className={`w-full text-left px-3 py-3 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
                    activeTab === tab.id
                      ? 'bg-[#1a472a]/10 text-[#1a472a] font-semibold'
                      : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Navigation + sign out */}
            <div className="px-3 py-2">
              <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold px-2 py-1">Navigation</p>
              <Link href="/" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
                <ArrowRight className="h-4 w-4 rotate-180" /> Back to Home
              </Link>
              <Link href="/contact" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
                <ArrowRight className="h-4 w-4" /> Contact Support
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors mt-1"
              >
                <ArrowRight className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Spacer: 56px top bar only (tabs are in nav/menu, not a second row) */}
      <div className="h-14 flex-shrink-0" />

      {/* Page content */}
      <main className="flex-1 w-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-16">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}

export default function MemberDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#ECEBE6] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a472a]" />
      </div>
    }>
      <MemberDashboardContent />
    </Suspense>
  );
}
