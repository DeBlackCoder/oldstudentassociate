'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Search } from 'lucide-react';
import AdminPaymentEditor, { adminPaymentInput } from './AdminPaymentEditor';
import PaymentStatus from './PaymentStatus';
import { formatNaira, quarterLabel, type AdminDuesInvoice, type AdminPaymentDirectoryEntry, type DuesInvoice } from './types';
import { paymentResponse, todayInNigeria } from './request';

interface DirectoryResponse { directory: AdminPaymentDirectoryEntry[]; dues: AdminDuesInvoice[]; canReview: boolean; year: number; currentQuarter: number; amountKobo: number }
export default function AdminPaymentDirectory() {
  const currentYear = Number(todayInNigeria().slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<DirectoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<{ person: AdminPaymentDirectoryEntry; period: DuesInvoice } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(() => fetch(`/api/admin/dues?year=${year}`, { cache: 'no-store' })
    .then(response => paymentResponse<DirectoryResponse>(response))
    .then(next => { setData(next); setError(''); })
    .catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load the member payment list.'))
    .finally(() => setLoading(false)), [year]);
  useEffect(() => { void load(); }, [load]);
  const members = (data?.directory || []).filter(person => `${person.fullName} ${person.membershipNumber || ''}`.toLowerCase().includes(search.toLowerCase()) && (!filter || (filter === 'not-paid' ? !person.notYetDue && person.status !== 'Paid' : filter === 'not-due' ? person.notYetDue : !person.notYetDue && person.status === filter)));
  return <section className="space-y-6 text-white">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">Member payment list</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">See paid and outstanding quarterly dues for every member. Confirm a transfer received directly, or correct a saved record.</p></div><button type="button" disabled={loading} onClick={() => { setLoading(true); void load(); }} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs text-white/60 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div>
    {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
    {message && <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-200"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />{message}</p>}
    <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px]"><label className="relative"><span className="sr-only">Search member payment list</span><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-white/30" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search member or membership number" className={`${adminPaymentInput} pl-10`} /></label><select aria-label="Payment year" value={year} onChange={event => { setYear(Number(event.target.value)); setLoading(true); setSelected(null); setData(null); }} className={adminPaymentInput}>{Array.from({ length: Math.max(1, currentYear - 2026 + 1) }, (_, i) => currentYear - i).map(value => <option key={value}>{value}</option>)}</select><select aria-label="Filter member payment status" value={filter} onChange={event => setFilter(event.target.value)} className={adminPaymentInput}><option value="">All members</option><option value="Paid">Paid up</option><option value="not-paid">Not paid up</option><option value="Pending">Awaiting confirmation</option><option value="not-due">Not yet due</option></select></div>
    {selected && <AdminPaymentEditor key={`${selected.person.id}-${selected.period.quarter}`} payment={selected.period} title={`${selected.person.fullName} · Q${selected.period.quarter}, ${year}`} endpoint={selected.period._id && /^[a-f0-9]{24}$/i.test(selected.period._id) ? `/api/admin/dues/${selected.period._id}` : undefined} recordEndpoint="/api/admin/dues" recordData={{ memberId: selected.person.id, year, quarter: selected.period.quarter }} canEdit={Boolean(data?.canReview)} onClose={() => setSelected(null)} onSaved={nextMessage => { setSelected(null); setMessage(nextMessage); void load(); }} />}
    {loading ? <div role="status" className="flex min-h-48 items-center justify-center gap-3 rounded-2xl border border-white/10 text-sm text-white/50"><Loader2 className="h-5 w-5 animate-spin" />Loading member list…</div> : !members.length ? <p className="rounded-2xl border border-white/10 p-6 text-sm text-white/50">No members match these filters.</p> : <div className="space-y-3">{members.map(person => <article key={person.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{person.fullName}</h2>{person.membershipNumber && <p className="mt-1 text-xs text-white/40">{person.membershipNumber}</p>}</div><div className="flex items-center gap-3">{person.notYetDue ? <span className="text-xs text-white/40">Not yet due</span> : <PaymentStatus status={person.status} dark />}<span className="text-xs text-white/50">{person.totalPaymentCount} overall payment{person.totalPaymentCount === 1 ? '' : 's'}</span></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{person.periods.map(period => <div key={period.quarter} className="rounded-xl border border-white/10 p-3"><p className="text-sm font-semibold">Q{period.quarter} · {year}</p><p className="mt-1 text-[11px] text-white/35">{quarterLabel(period.quarter)}</p><div className="mt-3 flex flex-wrap items-center gap-2"><PaymentStatus status={period.status} dark /><span className="text-xs text-white/60">{formatNaira(period.amountKobo, true)}</span></div><button type="button" onClick={() => { setSelected({ person, period: { ...period, ...data?.dues.find(invoice => invoice._id === period._id) } }); setMessage(''); }} className="mt-4 text-xs font-semibold text-emerald-300 underline">{data?.canReview ? period._id ? 'Edit payment record' : 'Record direct transfer' : 'View record'}</button></div>)}</div>{!person.periods.length && <p className="mt-4 text-xs text-white/35">No quarters due for this member in {year}.</p>}</article>)}</div>}
  </section>;
}
