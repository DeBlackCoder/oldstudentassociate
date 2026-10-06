'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, CheckCircle, Clock, CreditCard,
  FileText, IdCard, Loader2, Lock, User, XCircle,
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

export default function MemberDashboardPage() {
  const router = useRouter();
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

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

  /* ── Form required notice ─────────────────────────────────────── */
  const FormRequiredNotice = () => (
    <div className="rounded-3xl bg-[#F6F5F0] border border-white/60 shadow-xl shadow-black/5 p-8 text-center">
      <FileText className="h-8 w-8 mx-auto mb-3 text-neutral-400" />
      <p className="font-bold text-[#121417] mb-2">Membership Form Required</p>
      <p className="text-sm text-neutral-600 mb-6">
        Please fill in your membership registration form to access this section.
      </p>
      <Link
        href="/register"
        className="inline-flex items-center gap-2 rounded-full bg-[#1a472a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2d5f3f] transition-all active:scale-95"
      >
        Fill Registration Form <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );

  /* ── Payment required notice ──────────────────────────────────── */
  const PaymentRequiredNotice = () => (
    <div className="rounded-3xl bg-[#F6F5F0] border border-white/60 shadow-xl shadow-black/5 p-8 text-center">
      <CreditCard className="h-8 w-8 mx-auto mb-3 text-neutral-400" />
      <p className="font-bold text-[#121417] mb-2">Payment Required</p>
      <p className="text-sm text-neutral-600 mb-6">
        Complete your membership fee payment to access all member sections.
      </p>
      <Link
        href={`/register/payment?ref=${encodeURIComponent(member.applicationRef || '')}`}
        className="inline-flex items-center gap-2 rounded-full bg-[#1a472a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#2d5f3f] transition-all active:scale-95"
      >
        Pay Now <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );

  /* ── Status badge ─────────────────────────────────────────────── */
  const statusBadge = isApproved
    ? <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1">Approved</span>
    : isRejected
    ? <span className="rounded-full bg-red-100 text-red-700 text-xs font-semibold px-3 py-1">Rejected</span>
    : <span className="rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1">Pending</span>;

  /* ── Tab content ──────────────────────────────────────────────── */
  const renderTabContent = () => {
    switch (activeTab) {

      /* OVERVIEW ─────────────────────────────────────────────────── */
      case 'overview': return (
        <div className="space-y-5">
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
        if (!profileComplete) return <FormRequiredNotice />;
        return (
          <div className="space-y-5">
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
        if (!profileComplete) return <FormRequiredNotice />;
        if (!isPaid) return <PaymentRequiredNotice />;

        if (eventsLoading) {
          return (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#1a472a]" />
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
            // Free event — refresh list
            setEventsLoading(true);
            fetch('/api/member/events')
              .then(r => r.json())
              .then(d => { if (d?.success) setEvents(d.events || []); })
              .catch(() => {})
              .finally(() => setEventsLoading(false));
          }
          // Suppress unused param warning
          void isFree;
        }

        return (
          <div className="space-y-4">
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
        if (!profileComplete) return <FormRequiredNotice />;
        if (!isPaid) return <PaymentRequiredNotice />;
        return (
          <div className="rounded-3xl bg-[#F6F5F0] border border-white/60 shadow-xl shadow-black/5 p-8">
            <h2 className="font-bold text-xl text-[#121417] mb-2">Member Directory</h2>
            <p className="text-sm text-neutral-600">Browse and connect with fellow alumni across Rivers State.</p>
          </div>
        );
      }

      /* BENEFITS ───────────────────────────────────────────────────── */
      case 'benefits': {
        if (!profileComplete) return <FormRequiredNotice />;
        if (!isPaid) return <PaymentRequiredNotice />;
        return (
          <div className="space-y-4">
            <h2 className="font-bold text-xl text-[#121417]">Member Benefits</h2>
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
    <div className="min-h-screen bg-[#ECEBE6] px-4 py-16">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[#1a472a] flex items-center justify-center flex-shrink-0">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-[#121417]">{member.fullName || member.email}</p>
              <p className="text-xs text-neutral-500">{member.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-neutral-400 hover:text-red-500 transition-colors border border-neutral-200 rounded-full px-3 py-1.5"
          >
            Sign out
          </button>
        </div>

        {/* Tab navigation */}
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max border-b border-neutral-200 pb-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-[#1a472a] text-[#1a472a]'
                    : 'border-transparent text-neutral-500 hover:text-[#1a472a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div>
          {renderTabContent()}
        </div>

      </div>
    </div>
  );
}
