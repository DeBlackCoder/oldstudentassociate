'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ScholarshipApplicationView } from '@/lib/community/types';
import { canWithdraw } from '@/lib/community/policy';
import { formatDate } from './ContentDetails';

export default function ScholarshipApplications() {
  const [items, setItems] = useState<ScholarshipApplicationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => fetch('/api/member/scholarships')
    .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Unable to load applications'); return data; })
    .then(data => { setItems(data.applications); setError(''); })
    .catch(e => setError(e instanceof Error ? e.message : 'Please try again'))
    .finally(() => setLoading(false)), []);
  useEffect(() => { void load(); }, [load]);
  async function withdraw() {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/member/scholarships/${withdrawing}`, { method: 'DELETE' }); const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to withdraw');
      setWithdrawing(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again'); }
    finally { setBusy(false); }
  }
  return <section className="mb-8 space-y-4">
    <h2 className="text-xl font-bold text-[#173f26]">My scholarship applications</h2>
    {error && <p role="alert" className="text-sm text-red-700">{error} <button onClick={load} className="underline">Retry</button></p>}
    {loading ? <p className="text-sm text-neutral-500">Loading applications…</p> : !items.length && !error ? <p className="text-sm text-neutral-600">You have not applied for a scholarship yet. Explore the opportunities below.</p> : items.map(item => <details key={item._id} className="rounded-2xl border border-neutral-200 bg-white p-5">
      <summary className="cursor-pointer font-semibold">{item.scholarshipTitle} <span className="ml-2 inline-block rounded-full bg-[#E4EBDD] px-3 py-1 text-xs text-[#173f26]">{item.status}</span></summary>
      <div className="mt-4 space-y-3 text-sm">
        <p>Submitted: {formatDate(item.submittedAt, true)}{item.reviewedAt && ` · Reviewed: ${formatDate(item.reviewedAt, true)}`}</p>
        <p>{item.institution} · {item.courseOfStudy} · {item.academicLevel}</p>
        <p className="whitespace-pre-wrap">{item.statement}</p>
        <ul className="space-y-1">{item.documents.map((d, i) => <li key={i}><a href={d.url} target="_blank" rel="noopener noreferrer" className="underline">{d.label} ↗</a></li>)}</ul>
        {item.feedback && <div className="rounded-xl bg-neutral-50 p-4"><p className="mb-2 font-semibold">Feedback from the association</p><p className="whitespace-pre-wrap">{item.feedback}</p></div>}
        {canWithdraw(item.status) && (withdrawing === item._id ? <div className="space-y-3 rounded-xl bg-red-50 p-3"><p>Withdraw this application? You cannot submit another application for the same scholarship.</p><button disabled={busy} onClick={withdraw} className="mr-4 font-semibold text-red-700">{busy ? 'Withdrawing…' : 'Confirm withdrawal'}</button><button disabled={busy} onClick={() => setWithdrawing(null)}>Cancel</button></div> : <button onClick={() => setWithdrawing(item._id)} className="text-red-700 underline">Withdraw application</button>)}
      </div>
    </details>)}
  </section>;
}
