'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Fraunces, Figtree } from 'next/font/google';
import { ArrowRight, Check, Loader2, Mail, MapPin, Phone, Send } from 'lucide-react';
import { Reveal } from '@/app/contact/reveal'; // move reveal.tsx here (see note)

const display = Fraunces({ subsets: ['latin'], variable: '--font-display' });
const sans = Figtree({ subsets: ['latin'], variable: '--font-sans' });

const contactItems = [
  {
    label: 'Visit us',
    value: "No.4Wilson Close(Don's Ext), Off Location Rd, GRA 2, Port Harcourt, Rivers State",
    icon: MapPin,
    href: undefined as string | undefined,
  },
  { label: 'Email us', value: 'oldstudentsassociation94@gmail.com', icon: Mail, href: 'mailto:oldstudentsassociation94@gmail.com' },
  { label: 'Call Aaron', value: '08059867929', icon: Phone, href: 'tel:+2348059867929' },
  { label: 'Call Jeff', value: '08032276847', icon: Phone, href: 'tel:+2348032276847' },
  { label: 'Call Nneka', value: '08102894440', icon: Phone, href: 'tel:+2348102894440' },
  { label: 'Call Faith', value: '08127878463', icon: Phone, href: 'tel:+2348127878463' },
  { label: 'Call Patience', value: '08032757438', icon: Phone, href: 'tel:+2348032757438' },
];

// Index 0 = Sunday, matching Date.getDay()
const hours = [
  { day: 'Sunday', short: 'Sun', open: null as null | [number, number], label: 'Closed' },
  { day: 'Monday', short: 'Mon', open: [9, 17] as [number, number], label: '9:00 AM – 5:00 PM' },
  { day: 'Tuesday', short: 'Tue', open: [9, 17] as [number, number], label: '9:00 AM – 5:00 PM' },
  { day: 'Wednesday', short: 'Wed', open: [9, 17] as [number, number], label: '9:00 AM – 5:00 PM' },
  { day: 'Thursday', short: 'Thu', open: [9, 17] as [number, number], label: '9:00 AM – 5:00 PM' },
  { day: 'Friday', short: 'Fri', open: [9, 17] as [number, number], label: '9:00 AM – 5:00 PM' },
  { day: 'Saturday', short: 'Sat', open: [10, 14] as [number, number], label: '10:00 AM – 2:00 PM' },
];

const field =
  'w-full rounded-xl border border-[#173f26]/15 bg-white px-4 py-3 text-[#16201a] transition-all duration-200 placeholder:text-neutral-400 hover:border-[#173f26]/35 focus:border-[#173f26] focus:outline-none focus:ring-4 focus:ring-[#173f26]/10';

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [now, setNow] = useState<{ day: number; hour: number } | null>(null);

  // Computed after mount (Nigeria time) so server and client markup match.
  useEffect(() => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      weekday: 'short',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(new Date());
    const wk = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
    const hr = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    setNow({ day: hours.findIndex((h) => h.short === wk), hour: hr });
  }, []);

  const today = now ? hours[now.day] : null;
  const isOpen = !!(now && today?.open && now.hour >= today.open[0] && now.hour < today.open[1]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message.');
      setStatus('sent');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  function reset() {
    setForm({ name: '', email: '', subject: '', message: '' });
    setStatus('idle');
    setErrorMsg('');
  }

  return (
    <main
      className={`${display.variable} ${sans.variable} min-h-screen bg-[#EFEDE6] pb-20 pt-24 text-[#16201a] [font-family:var(--font-sans)] sm:pt-28`}
    >
      <style>{`
        @keyframes rise { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:none } }
        @keyframes pop { 0% { transform:scale(.4); opacity:0 } 70% { transform:scale(1.1) } 100% { transform:scale(1); opacity:1 } }
        @keyframes draw { to { stroke-dashoffset:0 } }
        @keyframes pulse-ring { 0% { transform:scale(1); opacity:.6 } 100% { transform:scale(2.6); opacity:0 } }
        @keyframes grow { from { transform:scaleX(0) } to { transform:scaleX(1) } }
        .rise { opacity:0; animation: rise .9s cubic-bezier(.22,1,.36,1) forwards }
        .pop { animation: pop .6s cubic-bezier(.22,1,.36,1) both }
        .draw { stroke-dasharray:30; stroke-dashoffset:30; animation: draw .5s .35s ease-out forwards }
        .pulse { animation: pulse-ring 2s ease-out infinite }
        .grow { transform-origin:left; animation: grow 1s .5s cubic-bezier(.22,1,.36,1) both }
        @media (prefers-reduced-motion: reduce) {
          .rise,.pop,.pulse,.grow { animation:none; opacity:1; transform:none }
          .draw { animation:none; stroke-dashoffset:0 }
        }
      `}</style>

      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:space-y-8 sm:px-6 lg:px-8">
        {/* Header */}
        <section className="relative overflow-hidden rounded-[2rem] bg-[#173f26] px-6 py-14 text-white sm:px-12 sm:py-20 lg:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full bg-[#2f7a4b]/40 blur-3xl"
          />
          <div className="relative max-w-2xl">
            <h1
              className="rise text-5xl font-semibold leading-[1.05] tracking-tight [font-family:var(--font-display)] sm:text-6xl lg:text-7xl"
              style={{ animationDelay: '100ms' }}
            >
              Let&apos;s talk.
            </h1>
            <div className="grow mt-7 h-px w-24 bg-[#d9b86a]" />
            <p
              className="rise mt-6 max-w-md text-lg leading-relaxed text-white/80"
              style={{ animationDelay: '400ms' }}
            >
              Questions, ideas or a fellow old student to find? Write to us and we&apos;ll reply
              within two business days.
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr] lg:items-start lg:gap-8">
          {/* Left column */}
          <div className="space-y-6">
            <Reveal>
              <div className="rounded-[1.75rem] bg-[#F8F7F2] p-7 sm:p-9">
                <h2 className="mb-7 text-2xl font-semibold [font-family:var(--font-display)]">
                  Reach us directly
                </h2>
                <ul className="space-y-6">
                  {contactItems.map(({ label, value, icon: Icon, href }) => {
                    const inner = (
                      <>
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#173f26] text-white transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-neutral-500">{label}</span>
                          <span className="block break-words leading-relaxed text-[#16201a]">{value}</span>
                        </span>
                      </>
                    );
                    return (
                      <li key={label}>
                        {href ? (
                          <a href={href} className="group flex items-start gap-4 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#173f26]">
                            {inner}
                          </a>
                        ) : (
                          <div className="group flex items-start gap-4">{inner}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-[1.75rem] bg-[#E4EBDD] p-7 sm:p-9">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold [font-family:var(--font-display)]">
                    Office hours
                  </h2>
                  {now && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm font-medium">
                      <span className="relative flex h-2.5 w-2.5">
                        {isOpen && <span className="pulse absolute inset-0 rounded-full bg-emerald-500" />}
                        <span className={`relative h-2.5 w-2.5 rounded-full ${isOpen ? 'bg-emerald-600' : 'bg-neutral-400'}`} />
                      </span>
                      {isOpen ? 'Open now' : 'Closed now'}
                    </span>
                  )}
                </div>
                <ul>
                  {hours.slice(1).concat(hours[0]).map((h) => {
                    const active = today?.day === h.day;
                    return (
                      <li
                        key={h.day}
                        className={`flex items-center justify-between gap-3 border-b border-[#173f26]/10 py-3 last:border-0 ${
                          active ? 'font-semibold text-[#173f26]' : 'text-neutral-700'
                        }`}
                      >
                        <span>
                          {h.day}
                          {active && <span className="ml-2 text-sm font-medium">(today)</span>}
                        </span>
                        <span>{h.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="group rounded-[1.75rem] bg-[#d9b86a] p-7 text-[#173f26] sm:p-9">
                <h2 className="mb-2 text-2xl font-semibold [font-family:var(--font-display)]">
                  Thinking of joining?
                </h2>
                <p className="mb-6 leading-7 text-[#173f26]/80">
                  Membership questions are answered on our membership page. Start there, or use the
                  form if you still need a hand.
                </p>
                <Link
                  href="/membership"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#173f26] px-6 text-sm font-semibold text-white transition-all hover:bg-[#1f5233] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f26] active:scale-95"
                >
                  Learn about membership
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>
          </div>

          {/* Form */}
          <Reveal delay={80}>
            <div className="rounded-[1.75rem] bg-[#F8F7F2] p-7 sm:p-10 lg:sticky lg:top-28">
              {status === 'sent' ? (
                <div role="status" className="flex flex-col items-center gap-4 py-14 text-center">
                  <div className="pop flex h-16 w-16 items-center justify-center rounded-full bg-[#173f26]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
                      <polyline className="draw" points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-semibold [font-family:var(--font-display)]">
                    Thanks, {form.name.split(' ')[0] || 'friend'}. We&apos;ve got it.
                  </h2>
                  <p className="max-w-sm leading-7 text-neutral-600">
                    We&apos;ll reply to {form.email} within 2 business days.
                  </p>
                  <button
                    onClick={reset}
                    className="mt-2 rounded-full border border-[#173f26] px-6 py-2.5 text-sm font-semibold text-[#173f26] transition-all hover:bg-[#173f26] hover:text-white active:scale-95"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="mb-2">
                    <h2 className="text-3xl font-semibold [font-family:var(--font-display)]">
                      Send us a message
                    </h2>
                    <p className="mt-2 text-neutral-600">All fields are required.</p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">Your name</label>
                      <input id="name" name="name" type="text" autoComplete="name" required value={form.name} onChange={handleChange} className={field} />
                    </div>
                    <div>
                      <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">Email address</label>
                      <input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange} className={field} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="mb-1.5 block text-sm font-semibold">What is it about?</label>
                    <input id="subject" name="subject" type="text" required value={form.subject} onChange={handleChange} className={field} />
                  </div>

                  <div>
                    <label htmlFor="message" className="mb-1.5 block text-sm font-semibold">Message</label>
                    <textarea id="message" name="message" rows={6} required value={form.message} onChange={handleChange} className={`${field} resize-none`} />
                  </div>

                  {status === 'error' && (
                    <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="group inline-flex h-12 w-full items-center justify-center rounded-full bg-[#173f26] px-8 font-semibold text-white transition-all hover:bg-[#1f5233] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f26] active:scale-95 disabled:opacity-80 sm:w-auto sm:min-w-[200px]"
                  >                    <span className="flex items-center justify-center gap-2" style={{ display: 'flex' }}>
                      {status === 'sending' ? (
                        <>
                          <Loader2 className="relative h-5 w-5 shrink-0 animate-spin" />
                          <span>Sending…</span>
                        </>
                      ) : (
                        <>
                          <span>Send message</span>
                          <Send className="relative h-4 w-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </>
                      )}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </main>
  );
}