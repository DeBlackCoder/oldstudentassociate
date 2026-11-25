'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Search } from 'lucide-react';
import { displayPaymentDate, formatNaira } from './types';

interface RegistrationPayment {
  _id: string;
  fullName: string;
  email: string;
  applicationRef: string;
  paymentStatus: 'unpaid' | 'paid' | 'failed';
  paymentAmount?: number;
  paymentExpectedAmount?: number;
  paymentClaimStatus?: 'pending' | 'confirmed';
  paymentClaimedAt?: string;
  savedAt?: string;
  paidAt?: string;
}

const inputClass = 'w-full rounded-xl border border-white/15 bg-[#171b24] p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/30';

export default function RegistrationPaymentReview() {
  const [items, setItems] = useState<RegistrationPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<RegistrationPayment | null>(null);
  const [remarks, setRemarks] = useState('');
  const [checked, setChecked] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => fetch('/api/admin/registration-payments', { cache: 'no-store' })
    .then(async response => { const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load registration payments'); return result; })
    .then(result => { setItems(result.payments || []); setCanReview(Boolean(result.canReview)); setError(''); })
    .catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load registration payments'))
    .finally(() => setLoading(false)), []);
  useEffect(() => { void load(); }, [load]);

  async function confirmPayment() {
    if (!selected || !canReview || !checked || !confirm) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/applications/${selected._id}/mark-paid`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remarks: remarks.trim() }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to confirm this registration payment');
      setMessage(selected.paymentClaimStatus === 'pending'
        ? `In-person payment confirmed for ${selected.fullName}. Their saved form has been submitted automatically for review.`
        : `Registration bank transfer confirmed for ${selected.fullName}. Their saved form has been submitted automatically for review.`);
      setSelected(null); setConfirm(false); setChecked(false); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to confirm this registration payment'); }
    finally { setBusy(false); }
  }

  const visible = items.filter(item => `${item.fullName} ${item.email} ${item.applicationRef}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="space-y-5 text-white">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-white">Registration fees</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">Review bank transfers and in-person payment reports for saved registration forms. Confirmed payments submit the form automatically. Paystack confirmations update automatically.</p></div><button type="button" disabled={loading || busy} onClick={() => { setLoading(true); void load(); }} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div>
    {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
    {message && <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200"><CheckCircle2 className="h-5 w-5 shrink-0" />{message}</p>}
    {!canReview && !loading && <p className="rounded-xl border border-white/10 p-4 text-sm text-white/60">Your role can view payments. An Admin or Super Admin must verify and confirm payment.</p>}
    {selected ? <div className="rounded-2xl border border-white/15 bg-[#121720] p-5 sm:p-7"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold text-white">{selected.fullName}</h2><p className="mt-1 text-sm text-white/60">{selected.email}</p></div><button type="button" disabled={busy} onClick={() => setSelected(null)} className="text-sm text-white/70 underline">Back to registration fees</button></div><p className="mt-5 text-3xl font-bold text-white">{formatNaira(selected.paymentExpectedAmount || 200_000, true)}</p>{selected.paymentClaimStatus === 'pending' ? <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100"><p className="font-semibold">Applicant reports paying an administrator in person.</p><p className="mt-1">Reported: {displayPaymentDate(selected.paymentClaimedAt)}. Confirm directly with the administrator who received the payment before approving.</p></div> : <p className="mt-3 break-all text-sm text-white/70">Transfer narration: <strong className="text-white">{selected.applicationRef}</strong></p>}<p className="mt-2 text-sm text-white/60">Form saved: {displayPaymentDate(selected.savedAt)}</p>
      <form onSubmit={event => { event.preventDefault(); setConfirm(true); }} className="mt-6 space-y-4"><fieldset disabled={busy || confirm || !canReview} className="space-y-4"><legend className="mb-4 text-sm font-semibold text-white">{selected.paymentClaimStatus === 'pending' ? 'Confirm the in-person payment' : 'Confirm the registration bank transfer'}</legend><label className="flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm leading-6 text-emerald-100"><input type="checkbox" required checked={checked} onChange={event => setChecked(event.target.checked)} className="mt-1.5 accent-emerald-600" /><span>{selected.paymentClaimStatus === 'pending' ? 'I verified directly with the administrator that the full registration fee was received.' : 'I checked the association’s bank statement and matched the applicant, application reference, and full registration fee.'}</span></label><label className="block text-sm text-white/70">Confirmation note (optional)<textarea rows={3} maxLength={2000} value={remarks} onChange={event => setRemarks(event.target.value)} className={`${inputClass} mt-2`} placeholder={selected.paymentClaimStatus === 'pending' ? 'Record who confirmed receipt or other details.' : 'Record the bank reference or confirmation details.'} /></label></fieldset>
      {confirm ? <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-5"><p className="font-semibold text-white">Confirm this registration payment for {selected.fullName}?</p><p className="mt-2 text-sm leading-6 text-white/70">Their saved registration form will be submitted automatically and become available in Applications for review.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={confirmPayment} disabled={busy || !canReview || !checked} className="inline-flex items-center gap-2 rounded-xl bg-[#2d7045] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Confirming…' : 'Confirm payment & submit form'}</button><button type="button" disabled={busy} onClick={() => setConfirm(false)} className="rounded-xl border border-white/20 px-4 py-3 text-sm text-white">Cancel</button></div></div> : <button disabled={busy || !canReview || !checked} className="rounded-xl bg-[#2d7045] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Review confirmation</button>}</form>
    </div> : <><label className="relative block"><span className="sr-only">Search registration fees</span><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-white/40" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, email, or application reference" className={`${inputClass} pl-10`} /></label>{loading ? <p role="status" className="flex items-center justify-center gap-2 py-12 text-white/60"><Loader2 className="h-5 w-5 animate-spin" />Loading registration fees…</p> : !visible.length ? <p className="rounded-2xl border border-white/10 p-8 text-center text-sm text-white/60">No saved registration forms are awaiting payment confirmation.</p> : <div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[680px] bg-transparent text-left text-sm [&_td]:border-white/10 [&_td]:text-white/80 [&_th]:border-white/10 [&_th]:text-white/70"><caption className="sr-only">Registration fees awaiting payment</caption><thead className="bg-white/5"><tr className="hover:bg-transparent">{['Applicant', 'Reference', 'Registration fee', 'Payment report', 'Saved', 'Action'].map(label => <th scope="col" key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{visible.map(item => <tr key={item._id} className="border-t border-white/10 hover:bg-white/5"><th scope="row" className="p-4"><p className="font-semibold text-white">{item.fullName}</p><p className="mt-1 text-xs font-normal text-white/50">{item.email}</p></th><td className="p-4 font-mono text-xs">{item.applicationRef}</td><td className="p-4">{formatNaira(item.paymentExpectedAmount || 200_000, true)}</td><td className="p-4">{item.paymentClaimStatus === 'pending' ? <span className="font-semibold text-amber-200">Paid in person · verify</span> : <span className="text-white/50">Not reported</span>}</td><td className="p-4">{displayPaymentDate(item.savedAt)}</td><td className="p-4"><button type="button" onClick={() => { setSelected(item); setRemarks(''); setChecked(false); setConfirm(false); setError(''); setMessage(''); }} className="text-xs font-semibold text-emerald-300 underline">{canReview ? item.paymentClaimStatus === 'pending' ? 'Verify in-person payment' : 'Review bank transfer' : 'View details'}</button></td></tr>)}</tbody></table></div>}</>}
  </section>;
}
