'use client';
import { useCallback, useEffect, useState } from 'react';
import { APPLICATION_STATUSES, type ScholarshipApplicationView } from '@/lib/community/types';
import { formatDate } from './ContentDetails';

const inputClass = 'w-full rounded-xl border border-white/20 bg-[#171b24] p-3 text-sm text-white';
export default function ScholarshipReview() {
  const [items, setItems] = useState<ScholarshipApplicationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ScholarshipApplicationView | null>(null);
  const [status, setStatus] = useState('Under Review');
  const [feedback, setFeedback] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => fetch('/api/admin/scholarship-applications')
    .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not load applications'); return data; })
    .then(data => { setItems(data.applications); setCanEdit(data.canEdit); setError(''); })
    .catch(e => setError(e instanceof Error ? e.message : 'Please try again'))
    .finally(() => setLoading(false)), []);
  useEffect(() => { void load(); }, [load]);
  function select(item: ScholarshipApplicationView) {
    setSelected(item); setStatus(['Under Review', 'Approved', 'Rejected'].includes(item.status) ? item.status : 'Under Review');
    setFeedback(item.feedback || ''); setNotes(item.internalNotes || ''); setMessage(''); setError('');
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; setBusy(true); setError('');
    try {
      const res = await fetch(`/api/admin/scholarship-applications/${selected._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, feedback, internalNotes: notes }),
      });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not save review');
      setSelected(null); setMessage('Review saved. The applicant can see the status and feedback in their dashboard.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again'); }
    finally { setBusy(false); }
  }
  const visible = items.filter(item => (!filter || item.status === filter) && `${item.fullName} ${item.scholarshipTitle} ${item.institution} ${item.email}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-5 text-white">
    <h2 className="text-2xl font-bold text-white">Scholarship applications</h2>
    <p className="text-sm text-white/50">Review applicants and supporting documents. Applicant feedback is visible to the applicant; internal notes stay with administrators.</p>
    {error && <p role="alert" className="rounded-xl bg-red-500/10 p-4 text-sm text-red-200">{error} <button onClick={load} className="underline">Reload applications</button></p>}
    {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-white/60">Search applicants<input type="search" value={search} onChange={e => setSearch(e.target.value)} className={`${inputClass} mt-1.5`} /></label><label className="text-sm text-white/60">Status<select value={filter} onChange={e => setFilter(e.target.value)} className={`${inputClass} mt-1.5`}><option value="">All statuses</option>{APPLICATION_STATUSES.map(s => <option key={s}>{s}</option>)}</select></label></div>
    {selected ? <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-bold text-white">{selected.fullName}</h3><p className="mt-1 text-sm text-white/60">{selected.scholarshipTitle} · {selected.status}</p></div><button disabled={busy} onClick={() => setSelected(null)} className="text-sm underline">Back to applications</button></div>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">{[
        ['Email', selected.email], ['Phone', selected.phoneNumber], ['Institution', selected.institution],
        ['Course', selected.courseOfStudy], ['Academic level', selected.academicLevel], ['Academic result', selected.academicResult],
        ['Submitted', formatDate(selected.submittedAt, true)], ['Application ID', selected._id],
      ].map(([label, value]) => <div key={label}><dt className="text-white/40">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
      <h4 className="mb-2 mt-6 font-semibold text-white/80">Personal statement</h4><p className="whitespace-pre-wrap text-sm leading-7 text-white/70">{selected.statement}</p>
      <h4 className="mb-2 mt-6 font-semibold text-white/80">Supporting documents</h4><ul className="space-y-2 text-sm">{selected.documents.map((doc, i) => <li key={i}><a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline">{doc.label} ↗</a></li>)}</ul>
      {canEdit && selected.status !== 'Withdrawn' ? <form onSubmit={save} className="mt-7 space-y-4 border-t border-white/10 pt-6"><fieldset disabled={busy} className="space-y-4"><label className="block text-sm text-white/60">Review decision<select className={`${inputClass} mt-1.5`} value={status} onChange={e => setStatus(e.target.value)}><option>Under Review</option><option>Approved</option><option>Rejected</option></select></label><label className="block text-sm text-white/60">Feedback for the applicant{status === 'Rejected' && ' (required)'}<textarea required={status === 'Rejected'} rows={4} maxLength={5000} value={feedback} onChange={e => setFeedback(e.target.value)} className={`${inputClass} mt-1.5`} /></label><label className="block text-sm text-white/60">Internal review notes (admin only)<textarea rows={4} maxLength={5000} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} mt-1.5`} /></label></fieldset><button disabled={busy} className="rounded-full bg-[#2d7045] px-6 py-3 text-sm font-semibold disabled:opacity-50">{busy ? 'Saving…' : 'Save review'}</button></form> : <div className="mt-6 space-y-3 text-sm text-white/60"><p>This application is read-only.</p>{selected.feedback && <p className="whitespace-pre-wrap">Applicant feedback: {selected.feedback}</p>}{selected.internalNotes && <p className="whitespace-pre-wrap">Internal notes: {selected.internalNotes}</p>}</div>}
    </div> : loading ? <p role="status" className="text-white/50">Loading applications…</p> : !visible.length ? <p className="rounded-xl border border-white/10 p-6 text-white/50">No applications match these filters.</p> : <div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full bg-transparent text-left text-sm [&_td]:border-white/10 [&_td]:text-white/70 [&_th]:border-white/10 [&_th]:text-xs [&_th]:font-medium [&_th]:normal-case [&_th]:tracking-normal [&_th]:text-white/55"><caption className="sr-only">Scholarship applications</caption><thead className="bg-white/5 text-white/50"><tr>{['Applicant', 'Scholarship', 'Institution', 'Submitted', 'Status', 'Review'].map(label => <th key={label} className="p-4" scope="col">{label}</th>)}</tr></thead><tbody>{visible.map(item => <tr key={item._id} className="border-t border-white/10"><th scope="row" className="p-4 font-medium">{item.fullName}</th><td className="p-4">{item.scholarshipTitle}</td><td className="p-4 text-white/60">{item.institution}</td><td className="whitespace-nowrap p-4 text-white/60">{formatDate(item.submittedAt)}</td><td className="whitespace-nowrap p-4">{item.status}</td><td className="p-4"><button onClick={() => select(item)} className="font-semibold text-emerald-300 underline">View</button></td></tr>)}</tbody></table></div>}
  </div>;
}
