'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Loader2, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import PaymentStatus from './PaymentStatus';
import RegistrationPaymentReview from './RegistrationPaymentReview';
import AdminPaymentDirectory from './AdminPaymentDirectory';
import AdminWelfarePayments from './AdminWelfarePayments';
import PaymentPrices from './PaymentPrices';
import { displayPaymentDate, formatNaira, quarterLabel, type AdminDuesInvoice } from './types';

interface DuplicatePayment { reference: string; invoiceId: string; memberId: string; amountKobo: number; paidAt?: string }
const inputClass = 'w-full rounded-xl border border-white/15 bg-[#171b24] p-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/10';

export default function AdminPayments() {
  const [view, setView] = useState<'dues' | 'registration' | 'directory' | 'welfare' | 'prices'>('dues');
  const [items, setItems] = useState<AdminDuesInvoice[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicatePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('Pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminDuesInvoice | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [note, setNote] = useState('');
  const [checkedStatement, setCheckedStatement] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const reviewRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => fetch(`/api/admin/dues${filter ? `?status=${encodeURIComponent(filter)}` : ''}`, { cache: 'no-store' })
    .then(async response => { const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load payments'); return result; })
    .then(result => { setItems(result.dues || []); setDuplicates(result.duplicates || []); setCanReview(Boolean(result.canReview)); setError(''); })
    .catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load payments'))
    .finally(() => setLoading(false)), [filter]);
  useEffect(() => { if (view === 'dues') void load(); }, [load, view]);
  useEffect(() => { if (selected) { reviewRef.current?.focus(); reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, [selected]);

  function select(item: AdminDuesInvoice) {
    setSelected(item); setDecision('approve'); setNote(''); setCheckedStatement(false); setConfirm(false); setError(''); setMessage('');
  }
  function changeFilter(value: string) {
    setFilter(value); setLoading(true); setSelected(null); setConfirm(false); setError('');
  }
  async function save() {
    if (!selected || !canReview || (decision === 'approve' && !checkedStatement) || (decision === 'reject' && note.trim().length < 3)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/dues/${selected._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, note: note.trim() }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to save your decision');
      setMessage(decision === 'approve' ? 'Bank transfer confirmed. The member’s dues and payment count have been updated.' : 'Transfer rejected. Your feedback is visible to the member, who can submit a new payment.');
      setSelected(null); setConfirm(false); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save your decision'); }
    finally { setBusy(false); }
  }

  const visible = items.filter(item => `${item.memberName} ${item.memberEmail} ${item.bankReference || ''} ${item.senderName || ''} ${item.year}`.toLowerCase().includes(search.toLowerCase()));
  const reviewable = selected?.status === 'Pending' && selected.paymentMethod === 'bank' && canReview;
  const tabs = <nav className="flex flex-wrap gap-2" aria-label="Payment types">{([{ id: 'dues', label: 'Quarterly transfers' }, { id: 'directory', label: 'Member payment list' }, { id: 'welfare', label: 'Welfare payments' }, { id: 'prices', label: 'Payment prices' }, { id: 'registration', label: 'Registration fee review' }] as const).map(tab => <button type="button" key={tab.id} onClick={() => setView(tab.id)} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${view === tab.id ? 'border-emerald-400/30 bg-[#1a472a] text-white' : 'border-white/15 text-white/60 hover:text-white'}`} aria-current={view === tab.id ? 'page' : undefined}>{tab.label}</button>)}</nav>;
  if (view === 'registration') return <div className="space-y-6">{tabs}<RegistrationPaymentReview /></div>;
  if (view === 'directory') return <div className="space-y-6">{tabs}<AdminPaymentDirectory /></div>;
  if (view === 'welfare') return <div className="space-y-6">{tabs}<AdminWelfarePayments /></div>;
  if (view === 'prices') return <div className="space-y-6">{tabs}<PaymentPrices /></div>;

  return <section className="space-y-6 text-white">
    {tabs}
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/70">Association contributions</p><h1 className="text-2xl font-bold text-white sm:text-3xl">Payment management</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">Confirm quarterly dues paid by bank transfer. Paystack payments are recorded automatically after verification.</p></div><button type="button" disabled={loading || busy} onClick={() => { setLoading(true); void load(); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-white/60 hover:border-white/25 hover:text-white disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div>
    {error && <p role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-200">{error} {!selected && <button type="button" onClick={load} className="ml-2 underline">Retry</button>}</p>}
    {message && <p role="status" className="flex items-start gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-200"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />{message}</p>}
    {duplicates.length > 0 && <details className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5"><summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" />{duplicates.length} additional Paystack payment{duplicates.length === 1 ? '' : 's'} need reconciliation</summary><p className="mt-3 text-xs leading-6 text-amber-100/65">These successful transactions were received for a quarter already marked paid. Check the Paystack transaction and the original invoice before arranging a correction or refund. No additional dues credit has been applied.</p><ul className="mt-4 space-y-3">{duplicates.map(item => <li key={item.reference} className="rounded-xl border border-amber-400/10 p-3 text-xs"><div className="flex flex-wrap justify-between gap-2"><span className="break-all font-mono text-amber-100">{item.reference}</span><span className="font-semibold text-amber-200">{formatNaira(item.amountKobo, true)}</span></div><p className="mt-2 break-all leading-5 text-amber-100/50">Invoice: {item.invoiceId} · Member: {item.memberId} · {displayPaymentDate(item.paidAt)}</p></li>)}</ul></details>}
    {!loading && !canReview && <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/60"><ShieldCheck className="h-4 w-4" />Your account can view these records. Payment decisions require an Admin or Super Admin.</p>}
    <div className="grid gap-3 sm:grid-cols-[1fr_240px]"><label className="relative block"><span className="sr-only">Search payment records</span><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-white/30" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search member, sender, or transfer reference" className={`${inputClass} pl-10`} /></label><label><span className="sr-only">Filter payments</span><select value={filter} disabled={busy} onChange={event => changeFilter(event.target.value)} className={inputClass}><option value="">All payment statuses</option><option value="Pending">Pending confirmation</option><option value="Paid">Paid</option><option value="Rejected">Rejected</option><option value="Unpaid">Unpaid</option></select></label></div>
    {selected ? <div ref={reviewRef} tabIndex={-1} className="scroll-mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 outline-none sm:p-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-white">{selected.memberName}</h2><p className="mt-1 text-sm text-white/50">Quarter {selected.quarter}, {selected.year} · {quarterLabel(selected.quarter)}</p></div><button type="button" disabled={busy} onClick={() => { setSelected(null); setConfirm(false); }} className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white disabled:opacity-50"><ArrowLeft className="h-3.5 w-3.5" />Back to payment records</button></div>
      <div className="mb-6 flex flex-wrap items-center gap-4"><p className="text-3xl font-bold text-white">{formatNaira(selected.amountKobo, true)}</p><PaymentStatus status={selected.status} dark /></div>
      <dl className="grid gap-5 text-sm sm:grid-cols-2">{[
        ['Member email', selected.memberEmail], ['Payment method', selected.paymentMethod === 'bank' ? 'Bank transfer' : selected.paymentMethod === 'paystack' ? 'Paystack' : 'Not selected'],
        ['Sender’s account name', selected.senderName || '—'], ['Transfer reference', selected.bankReference || '—'],
        ['Transfer date', displayPaymentDate(selected.transferDate)], ['Confirmed date', displayPaymentDate(selected.paidAt)], ['Invoice ID', selected._id],
      ].map(([label, value]) => <div key={label}><dt className="text-xs text-white/35">{label}</dt><dd className="mt-1.5 break-words text-white/80">{value}</dd></div>)}</dl>
      {selected.adminNote && <div className="mt-6 rounded-xl border border-white/10 p-4"><p className="mb-2 text-xs font-semibold text-white/45">Feedback recorded</p><p className="whitespace-pre-wrap text-sm leading-6 text-white/70">{selected.adminNote}</p></div>}
      {reviewable ? <form onSubmit={event => { event.preventDefault(); setConfirm(true); }} className="mt-7 space-y-5 border-t border-white/10 pt-6"><fieldset disabled={busy || confirm} className="space-y-5"><legend className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><ClipboardCheck className="h-4 w-4 text-emerald-300" />Review bank transfer</legend><label className="block text-sm text-white/60">Decision<select value={decision} onChange={event => { setDecision(event.target.value as 'approve' | 'reject'); setCheckedStatement(false); }} className={`${inputClass} mt-1.5`}><option value="approve">Confirm transfer and mark quarter paid</option><option value="reject">Reject transfer request</option></select></label>{decision === 'approve' && <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-sm leading-6 text-emerald-100/80"><input required type="checkbox" checked={checkedStatement} onChange={event => setCheckedStatement(event.target.checked)} className="mt-1.5 accent-emerald-600" /><span>I checked the association’s bank statement and matched the sender, reference, and full amount to this quarter.</span></label>}<label className="block text-sm text-white/60">Feedback for the member{decision === 'reject' ? ' (required)' : ' (optional)'}<textarea rows={3} required={decision === 'reject'} minLength={decision === 'reject' ? 3 : undefined} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} className={`${inputClass} mt-1.5`} placeholder={decision === 'reject' ? 'Explain why the transfer could not be confirmed.' : 'Add a short confirmation note, if needed.'} /></label></fieldset>
      {confirm ? <div className={`rounded-2xl border p-5 ${decision === 'approve' ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-red-400/20 bg-red-400/5'}`}><p className="text-sm font-semibold text-white">{decision === 'approve' ? `Confirm ${formatNaira(selected.amountKobo, true)} for ${selected.memberName}?` : `Reject this transfer request for ${selected.memberName}?`}</p><p className="mt-2 text-xs leading-5 text-white/50">{decision === 'approve' ? 'This marks the quarter paid and increases the member’s confirmed payment count.' : 'The quarter remains outstanding. The member can see your feedback and make a new payment.'}</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={save} className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${decision === 'approve' ? 'bg-[#2d7045] hover:bg-[#368651]' : 'bg-red-600 hover:bg-red-700'}`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Saving decision…' : decision === 'approve' ? 'Confirm payment' : 'Reject transfer'}</button><button type="button" disabled={busy} onClick={() => setConfirm(false)} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/60 hover:text-white">Cancel</button></div></div> : <button disabled={busy || (decision === 'approve' && !checkedStatement) || (decision === 'reject' && note.trim().length < 3)} className="rounded-xl bg-[#2d7045] px-5 py-3 text-sm font-semibold text-white hover:bg-[#368651] disabled:cursor-not-allowed disabled:opacity-40">Review decision</button>}</form> : <p className="mt-6 rounded-xl border border-white/10 p-4 text-xs leading-6 text-white/50">{selected.paymentMethod === 'paystack' ? 'Paystack payments are confirmed automatically by verified provider responses.' : selected.status !== 'Pending' ? 'This invoice is read-only. Only bank transfers awaiting confirmation can be reviewed.' : 'Your role has read-only access to payment records.'}</p>}
    </div> : loading ? <div role="status" className="flex min-h-48 items-center justify-center gap-3 rounded-2xl border border-white/10 text-sm text-white/50"><Loader2 className="h-5 w-5 animate-spin text-emerald-300" />Loading payment records…</div> : !visible.length ? <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center"><ClipboardCheck className="mx-auto mb-3 h-7 w-7 text-emerald-300/40" /><p className="text-sm text-white/50">No payments match these filters.</p><p className="mt-2 text-xs text-white/30">Submitted bank transfers appear under Pending confirmation.</p></div> : <><p className="text-xs text-white/35">{visible.length} record{visible.length === 1 ? '' : 's'} shown</p><div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[640px] bg-transparent text-left text-sm [&_td]:border-white/10 [&_td]:text-white/70 [&_th]:border-white/10 [&_th]:text-xs [&_th]:font-medium [&_th]:normal-case [&_th]:tracking-normal [&_th]:text-white/55"><caption className="sr-only">Quarterly association dues payments</caption><thead className="bg-white/5"><tr className="hover:bg-transparent">{['Member', 'Quarter', 'Amount', 'Method', 'Status', 'Record'].map(label => <th key={label} scope="col" className="p-4">{label}</th>)}</tr></thead><tbody>{visible.map(item => <tr key={item._id} tabIndex={0} aria-label={`View payment for ${item.memberName}, quarter ${item.quarter}, ${item.year}`} onClick={() => select(item)} onKeyDown={event => { if (event.target === event.currentTarget && event.key === 'Enter') select(item); }} className="cursor-pointer border-t border-white/10 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"><th scope="row" className="p-4"><p className="font-semibold text-white/85">{item.memberName}</p><p className="mt-1 font-normal text-white/35">{item.memberEmail}</p></th><td className="whitespace-nowrap p-4">Q{item.quarter} · {item.year}</td><td className="whitespace-nowrap p-4 font-semibold">{formatNaira(item.amountKobo, true)}</td><td className="p-4 text-xs">{item.paymentMethod === 'bank' ? 'Bank transfer' : item.paymentMethod === 'paystack' ? 'Paystack' : '—'}</td><td className="p-4"><PaymentStatus status={item.status} dark /></td><td className="p-4"><button type="button" onClick={event => { event.stopPropagation(); select(item); }} className="text-xs font-semibold text-emerald-300 underline">{item.status === 'Pending' && item.paymentMethod === 'bank' && canReview ? 'Review transfer' : 'View details'}</button></td></tr>)}</tbody></table></div></>}
  </section>;
}
