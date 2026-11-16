'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { adminPaymentInput } from './AdminPaymentEditor';
import { formatNaira } from './types';
import { paymentResponse } from './request';

interface PriceResponse { settings: { quarterlyDuesKobo: number }; canEdit: boolean }
export default function PaymentPrices() {
  const [data, setData] = useState<PriceResponse | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(() => fetch('/api/admin/payment-settings', { cache: 'no-store' })
    .then(response => paymentResponse<PriceResponse>(response))
    .then(next => { setData(next); setAmount(String(next.settings.quarterlyDuesKobo / 100)); setError(''); })
    .catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load payment prices.'))
    .finally(() => setLoading(false)), []);
  useEffect(() => { void load(); }, [load]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await paymentResponse(await fetch('/api/admin/payment-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quarterlyDuesKobo: Math.round(Number(amount) * 100), note: note.trim() }) }));
      setNote(''); setMessage('Quarterly payment price updated. New invoices use the new amount; existing payments keep their captured amount.'); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update payment prices.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-6 text-white"><div><h1 className="text-2xl font-bold">Payment prices</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">Manage the amount due every three months. Set welfare prices separately when creating or editing a welfare payment fund.</p></div>{error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}{message && <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-200"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />{message}</p>}{loading ? <p role="status" className="flex items-center gap-3 text-sm text-white/50"><Loader2 className="h-5 w-5 animate-spin" />Loading prices…</p> : data && <form onSubmit={save} className="max-w-2xl space-y-5 rounded-2xl border border-white/10 bg-[#131820] p-6"><p className="text-sm text-white/50">Current quarterly dues</p><p className="text-4xl font-bold">{formatNaira(data.settings.quarterlyDuesKobo, true)}</p><p className="text-sm text-white/50">{formatNaira(data.settings.quarterlyDuesKobo * 4, true)} per full year</p><fieldset disabled={busy || !data.canEdit} className="space-y-5"><label className="block text-sm text-white/65">Amount every three months (₦)<input required type="number" min="1" max="1000000" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} className={`${adminPaymentInput} mt-2`} /></label><label className="block text-sm text-white/65">Reason for the price change<textarea required minLength={3} maxLength={2000} rows={3} value={note} onChange={event => setNote(event.target.value)} className={`${adminPaymentInput} mt-2`} /></label></fieldset><p className="text-xs leading-6 text-white/40">Confirmed payments and existing invoices retain their original amount. A price change applies when new invoices are created.</p>{data.canEdit ? <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#2d7045] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Saving…' : 'Update quarterly price'}</button> : <p className="text-sm text-white/50">Your role can view prices. Changes require an Admin or Super Admin.</p>}</form>}</section>;
}
