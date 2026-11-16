'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import PaymentStatus from './PaymentStatus';
import { displayPaymentDate, formatNaira, type DuesStatus } from './types';
import { paymentResponse } from './request';

export const adminPaymentInput = 'w-full rounded-xl border border-white/15 bg-[#171b24] px-3.5 py-3 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/10';
interface EditablePayment {
  _id?: string; status: DuesStatus; amountKobo: number; paymentMethod?: 'bank' | 'paystack';
  bankReference?: string; senderName?: string; transferDate?: string; paidAt?: string; adminNote?: string;
}
export default function AdminPaymentEditor({ payment, title, endpoint, recordEndpoint, recordData, canEdit, onSaved, onClose }: {
  payment: EditablePayment; title: string; endpoint?: string; recordEndpoint: string;
  recordData: Record<string, string | number>; canEdit: boolean; onSaved: (message: string) => void; onClose: () => void;
}) {
  const [operation, setOperation] = useState(payment.status === 'Pending' && payment.paymentMethod === 'bank' ? 'approve' : 'correct');
  const [status, setStatus] = useState<'Paid' | 'Unpaid' | 'Rejected'>(payment.status === 'Paid' ? 'Paid' : 'Unpaid');
  const [amount, setAmount] = useState(String(payment.amountKobo / 100));
  const [reference, setReference] = useState(payment.bankReference || '');
  const [note, setNote] = useState('');
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const manual = !endpoint;
  const markingPaid = manual || operation === 'approve' || (operation === 'correct' && status === 'Paid');
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!canEdit || (markingPaid && !verified)) return;
    setBusy(true); setError('');
    try {
      const body = manual ? { ...recordData, bankReference: reference.trim(), note: note.trim() } : operation === 'correct' ? { operation: 'correct', status, amountKobo: Math.round(Number(amount) * 100), note: note.trim(), ...(reference.trim() ? { bankReference: reference.trim() } : {}) } : { decision: operation, note: note.trim() };
      await paymentResponse(await fetch(endpoint || recordEndpoint, { method: endpoint ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
      onSaved(manual || operation === 'approve' ? 'Bank transfer confirmed. The member payment list and overall count have been updated.' : 'Payment record updated. The member list now reflects your correction.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update payment.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-5 rounded-2xl border border-white/10 bg-[#131820] p-5 text-white sm:p-7">
    <div className="flex items-start justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">Payment record</p><h2 className="text-xl font-bold">{title}</h2></div><button type="button" disabled={busy} onClick={onClose} aria-label="Close payment editor" className="rounded-full p-2 text-white/50 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button></div>
    <div className="flex flex-wrap items-center gap-4"><p className="text-3xl font-bold">{formatNaira(payment.amountKobo, true)}</p><PaymentStatus status={payment.status} dark /></div>
    {(payment.bankReference || payment.senderName || payment.paidAt) && <dl className="grid gap-4 rounded-xl border border-white/10 p-4 text-sm sm:grid-cols-2">{[['Sender', payment.senderName || '—'], ['Transfer reference', payment.bankReference || '—'], ['Transfer date', displayPaymentDate(payment.transferDate)], ['Confirmed', displayPaymentDate(payment.paidAt)]].map(([label, value]) => <div key={label}><dt className="text-xs text-white/40">{label}</dt><dd className="mt-1 break-all text-white/80">{value}</dd></div>)}</dl>}
    {payment.adminNote && <p className="rounded-xl border border-white/10 p-4 text-sm leading-6 text-white/60"><strong>Previous feedback: </strong>{payment.adminNote}</p>}
    {canEdit ? <><fieldset disabled={busy} className="space-y-5">
      {manual ? <p className="text-sm leading-6 text-white/60">Record a transfer received directly by the association. Confirm its full amount against the bank statement.</p> : <label className="block text-sm text-white/65">Action<select value={operation} onChange={event => { setOperation(event.target.value); setVerified(false); }} className={`${adminPaymentInput} mt-2`}>{payment.status === 'Pending' && payment.paymentMethod === 'bank' && <><option value="approve">Confirm submitted bank transfer</option><option value="reject">Reject submitted transfer</option></>}<option value="correct">Correct payment record</option></select></label>}
      {!manual && operation === 'correct' && <><label className="block text-sm text-white/65">Payment status<select value={status} onChange={event => { setStatus(event.target.value as typeof status); setVerified(false); }} className={`${adminPaymentInput} mt-2`}><option value="Paid">Paid</option><option value="Unpaid">Unpaid</option><option value="Rejected">Rejected</option></select></label><label className="block text-sm text-white/65">Recorded amount (₦)<input type="number" required min="1" max="10000000" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} className={`${adminPaymentInput} mt-2`} /></label></>}
      {(manual || operation === 'correct') && <label className="block text-sm text-white/65">Bank transfer reference{manual ? ' (required)' : ' (optional)'}<input required={manual} minLength={manual ? 3 : undefined} maxLength={150} value={reference} onChange={event => setReference(event.target.value)} className={`${adminPaymentInput} mt-2`} /></label>}
      <label className="block text-sm text-white/65">Reason / confirmation note (required)<textarea required minLength={3} maxLength={2000} rows={3} value={note} onChange={event => setNote(event.target.value)} className={`${adminPaymentInput} mt-2`} placeholder="Explain the payment confirmation or correction." /></label>
      {markingPaid && <label className="flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm leading-6 text-emerald-100/80"><input required type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} className="mt-1.5 accent-emerald-600" /><span>I checked the payment evidence and bank statement before marking this member paid.</span></label>}
    </fieldset>{error && <p role="alert" className="text-sm text-red-200">{error}</p>}<div className="flex flex-wrap gap-3"><button disabled={busy || (markingPaid && !verified)} className="inline-flex items-center gap-2 rounded-xl bg-[#2d7045] px-5 py-3 text-sm font-semibold text-white hover:bg-[#368651] disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{busy ? 'Saving…' : manual || operation === 'approve' ? 'Confirm payment' : 'Save correction'}</button><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-white/15 px-5 py-3 text-sm text-white/60">Cancel</button></div></> : <p className="text-sm leading-6 text-white/60">Your role can view payment records. Changes require an Admin or Super Admin.</p>}
  </form>;
}
