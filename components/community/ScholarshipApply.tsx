'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CommunityRecord } from '@/lib/community/types';
import { applicationWindow } from '@/lib/community/policy';

type Scholarship = Extract<CommunityRecord, { kind: 'scholarships' }>;
const inputClass = 'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#173f26]/30';
export default function ScholarshipApply({ record, onApplied }: { record: Scholarship; onApplied?: () => void }) {
  const [session, setSession] = useState<'loading' | 'signed-in' | 'signed-out' | 'error'>('loading');
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existing, setExisting] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/member/scholarships', { signal: controller.signal })
      .then(async res => {
        if (res.status === 401) { setSession('signed-out'); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not check your application status');
        setSession('signed-in');
        setExisting(data.applications.find((a: { scholarshipId: string }) => a.scholarshipId === record._id)?.status || null);
      }).catch(e => { if (e.name !== 'AbortError') { setSession('error'); setError(e.message); } });
    return () => controller.abort();
  }, [record._id, revision]);
  const windowStatus = applicationWindow(record);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const fields = ['fullName', 'phoneNumber', 'institution', 'courseOfStudy', 'academicLevel', 'academicResult', 'statement'];
    const body = Object.fromEntries(fields.map(key => [key, form.get(key)]));
    try {
      const response = await fetch(`/api/community/${record._id}/apply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body,
          documents: record.details.requiredDocuments.map((label, i) => ({ label, url: form.get(`document-${i}`) })),
          declaration: form.get('declaration') === 'on',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Application could not be submitted');
      setSuccess(true); setOpen(false); setExisting('Submitted'); onApplied?.();
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again'); }
    finally { setBusy(false); }
  }
  return <section className="mt-7 rounded-2xl bg-[#E4EBDD] p-5">
    <h3 className="text-lg font-bold text-[#173f26]">Apply for this scholarship</h3>
    {error && <p role="alert" className="my-3 text-sm text-red-700">{error}</p>}
    {success && <p role="status" className="my-3 text-sm text-green-800">Your application has been submitted. Track the review in your member dashboard.</p>}
    {existing ? <p className="mt-3 text-sm">Your application: <strong>{existing}</strong>. <Link className="underline" href="/members/dashboard?tab=scholarships">View your applications</Link></p>
      : windowStatus !== 'Open' ? <p className="mt-3 text-sm">{windowStatus === 'Upcoming' ? 'Applications have not opened yet.' : 'Applications are closed.'}</p>
      : session === 'loading' ? <p className="mt-3 text-sm">Checking your account…</p>
      : session === 'error' ? <button type="button" className="mt-3 text-sm font-semibold underline" onClick={() => { setError(''); setSession('loading'); setRevision(r => r + 1); }}>Retry account check</button>
      : session === 'signed-out' ? <p className="mt-3 text-sm"><Link href="/login" className="font-semibold underline">Sign in</Link> or <Link href="/signup" className="font-semibold underline">create and verify an account</Link> to apply. Membership approval or payment is not required for scholarship applications.</p>
      : <>
        <button type="button" className="mt-4 rounded-full bg-[#173f26] px-5 py-2.5 text-sm font-semibold text-white" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close application form' : 'Start application'}</button>
        {open && <form onSubmit={submit} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">{[
            ['fullName', 'Full name'], ['phoneNumber', 'Phone number'], ['institution', 'School / institution'],
            ['courseOfStudy', 'Course / programme of study'], ['academicLevel', 'Current academic level'], ['academicResult', 'Academic result / grade'],
          ].map(([name, label]) => <label key={name} className="block text-sm font-medium">{label}<input required name={name} maxLength={name === 'academicResult' ? 1000 : 200} className={`${inputClass} mt-1.5`} /></label>)}</div>
          <label className="block text-sm font-medium">Personal statement<textarea required name="statement" minLength={100} maxLength={10000} rows={6} className={`${inputClass} mt-1.5`} placeholder="Explain your educational goals, eligibility and why this support would help (at least 100 characters)." /></label>
          <fieldset className="space-y-3"><legend className="mb-2 font-semibold">Supporting documents</legend><p className="text-xs text-neutral-600">Provide a viewable link to each document, for example a shared Google Drive or Dropbox file. Make sure reviewers can open the link.</p>{record.details.requiredDocuments.map((label, i) => <label key={i} className="block text-sm font-medium">{label}<input required type="url" name={`document-${i}`} maxLength={2000} pattern="https?://.*" className={`${inputClass} mt-1.5`} placeholder="https://…" /></label>)}</fieldset>
          <label className="flex items-start gap-3 text-sm"><input required type="checkbox" name="declaration" className="mt-1" />I confirm that my information is accurate and that the association may review my supporting documents for this application.</label>
          <button disabled={busy} className="rounded-full bg-[#173f26] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Submitting…' : 'Submit application'}</button>
        </form>}
      </>}
  </section>;
}
