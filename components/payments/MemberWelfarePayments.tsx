'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, CreditCard, HeartHandshake, Loader2, RefreshCw, Search } from 'lucide-react';
import PaymentStatus from './PaymentStatus';
import { displayPaymentDate, formatNaira, type BankAccount, type WelfareFund } from './types';
import { openPaystack, paymentResponse, todayInNigeria } from './request';

interface WelfareResponse { success: boolean; funds: WelfareFund[]; bankAccount: BankAccount | null }
const inputClass = 'w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-black outline-none focus:border-[#1a472a] focus:ring-2 focus:ring-[#1a472a]/10';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#1a472a] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2d5f3f] disabled:cursor-not-allowed disabled:opacity-50';

export default function MemberWelfarePayments() {
  const [data, setData] = useState<WelfareResponse | null>(null);
  const [fundId, setFundId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [checkout, setCheckout] = useState(false);
  const [method, setMethod] = useState<'paystack' | 'bank'>('paystack');
  const [senderName, setSenderName] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [transferDate, setTransferDate] = useState('');

  const load = useCallback(() => fetch('/api/member/welfare-payments', { cache: 'no-store' })
    .then(response => paymentResponse<WelfareResponse>(response))
    .then(next => {
      setData(next); setError('');
      setFundId(previous => next.funds.some(fund => fund._id === previous) ? previous : next.funds.find(fund => fund.isActive)?._id || next.funds[0]?._id || '');
    })
    .catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load welfare payments.'))
    .finally(() => setLoading(false)), []);
  useEffect(() => { void load(); }, [load]);

  const fund = data?.funds.find(item => item._id === fundId);
  const payment = fund?.ownPayment;
  const directory = fund?.directory || [];
  const members = directory.filter(person => `${person.fullName} ${person.membershipNumber || ''}`.toLowerCase().includes(search.toLowerCase()) && (!filter || (filter === 'not-paid' ? person.status !== 'Paid' : person.status === filter)));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!fund) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await paymentResponse<{ success: boolean; authorizationUrl?: string }>(await fetch('/api/member/welfare-payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fundId: fund._id, method, ...(method === 'bank' ? { bankReference: bankReference.trim(), senderName: senderName.trim(), transferDate } : {}) }),
      }));
      if (method === 'paystack') {
        if (!result.authorizationUrl) throw new Error('Paystack checkout is unavailable. Please try again.');
        openPaystack(result.authorizationUrl);
      } else {
        setCheckout(false); setMessage('Transfer submitted. An administrator will confirm your welfare payment after checking the bank statement.'); await load();
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to start welfare payment.'); }
    finally { setBusy(false); }
  }

  return <section className="space-y-6 text-black">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#42664e]">Supporting our community</p><h1 className="text-2xl font-bold text-[#173f26] sm:text-3xl">Welfare payments</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">Contribute to welfare funds and see members who have paid and those awaiting payment.</p></div><button type="button" disabled={loading || busy} onClick={() => { setLoading(true); void load(); }} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div>
    {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />{message}</p>}
    {loading ? <div role="status" className="flex min-h-48 items-center justify-center gap-3 rounded-3xl border border-neutral-200 bg-white text-sm"><Loader2 className="h-5 w-5 animate-spin" />Loading welfare payments…</div> : !fund ? <div className="rounded-3xl border border-neutral-200 bg-white p-8"><HeartHandshake className="mb-4 h-8 w-8 text-[#1a472a]" /><h2 className="text-lg font-bold">No welfare payment funds yet</h2><p className="mt-2 text-sm leading-6">Funds and their contribution amounts appear here when an administrator creates them.</p></div> : <>
      <label className="block max-w-xl text-sm font-semibold">Welfare fund<select disabled={busy} value={fundId} onChange={event => { setFundId(event.target.value); setCheckout(false); setSearch(''); setFilter(''); setError(''); setMessage(''); }} className={`${inputClass} mt-2`}>{data?.funds.map(item => <option key={item._id} value={item._id}>{item.title}{!item.isActive ? ' (closed)' : ''}</option>)}</select></label>
      <article data-dashboard-surface="dark" className="rounded-3xl bg-[#1a472a] p-6 text-white sm:p-8"><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-xl font-bold">{fund.title}</h2><PaymentStatus status={payment?.status || 'Unpaid'} dark /></div>{fund.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/80">{fund.description}</p>}<p className="mt-5 text-4xl font-bold">{formatNaira(payment?.amountKobo || fund.amountKobo, true)}</p><p className="mt-3 text-sm leading-6 text-white/80">Paystack confirms automatically. Bank transfers are confirmed by an administrator.</p>{payment?.status === 'Paid' ? <p className="mt-5 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4" />Paid · confirmed {displayPaymentDate(payment.paidAt)}</p> : payment?.status === 'Pending' ? <p className="mt-5 rounded-xl bg-white/10 p-4 text-sm leading-6">Your payment is awaiting confirmation. Refresh after completing Paystack checkout or after the administrator reviews your transfer.</p> : fund.isActive ? <button type="button" disabled={busy} onClick={() => { setCheckout(true); setError(''); setMethod('paystack'); setSenderName(''); setBankReference(''); setTransferDate(''); }} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black">{payment?.status === 'Rejected' ? 'Make a new welfare payment' : 'Pay welfare contribution'}<ArrowRight className="h-4 w-4" /></button> : <p className="mt-5 text-sm text-white/80">This fund is closed to new payments.</p>}{payment?.adminNote && <p className="mt-4 rounded-xl bg-white/10 p-4 text-sm leading-6"><strong>Admin feedback: </strong>{payment.adminNote}</p>}</article>
      {checkout && <form onSubmit={submit} className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-6 text-black"><h2 className="text-xl font-bold">Pay {fund.title}</h2><fieldset disabled={busy} className="space-y-5"><legend className="mb-3 text-sm font-semibold">Payment method</legend><div className="grid gap-3 sm:grid-cols-2">{([{ id: 'paystack', label: 'Paystack', icon: CreditCard, detail: 'Automatic confirmation' }, { id: 'bank', label: 'Bank transfer', icon: Building2, detail: 'Admin confirmation' }] as const).map(item => <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${method === item.id ? 'border-[#1a472a] bg-[#E4EBDD]' : 'border-neutral-200'}`}><input type="radio" name="welfare-payment-method" checked={method === item.id} onChange={() => setMethod(item.id)} className="mt-1 accent-[#1a472a]" /><span><item.icon className="mb-2 h-5 w-5" /><span className="block text-sm font-semibold">{item.label}</span><span className="mt-1 block text-xs">{item.detail}</span></span></label>)}</div>{method === 'bank' ? data?.bankAccount ? <><dl className="space-y-3 rounded-2xl bg-neutral-50 p-4 text-sm">{[['Bank', data.bankAccount.bankName], ['Account name', data.bankAccount.accountName], ['Account number', data.bankAccount.accountNumber], ['Transfer amount', formatNaira(payment?.amountKobo || fund.amountKobo, true)]].map(([label, value]) => <div className="flex flex-wrap justify-between gap-2" key={label}><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl><p className="text-sm leading-6">Transfer to the association first, then submit these details for admin confirmation.</p><label className="block text-sm font-medium">Sender’s account name<input required autoComplete="name" minLength={3} maxLength={200} value={senderName} onChange={event => setSenderName(event.target.value)} className={`${inputClass} mt-2`} /></label><label className="block text-sm font-medium">Transfer reference<input required minLength={3} maxLength={150} value={bankReference} onChange={event => setBankReference(event.target.value)} className={`${inputClass} mt-2`} /></label><label className="block text-sm font-medium">Transfer date<input required type="date" max={todayInNigeria()} value={transferDate} onChange={event => setTransferDate(event.target.value)} className={`${inputClass} mt-2`} /></label></> : <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6">Bank transfer details are unavailable. Use Paystack or contact the administrator.</p> : <p className="text-sm leading-6">Continue to secure Paystack checkout. This member directory updates automatically once payment is verified.</p>}</fieldset><div className="flex flex-wrap gap-3"><button disabled={busy || (method === 'bank' && !data?.bankAccount)} className={buttonClass}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{method === 'bank' ? 'Submit transfer for confirmation' : 'Continue to Paystack'}</button><button type="button" disabled={busy} onClick={() => setCheckout(false)} className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-semibold">Cancel</button></div></form>}
      <div><h2 className="text-xl font-bold text-[#173f26]">Member welfare payment list</h2><p className="mt-2 text-sm leading-6 text-neutral-600">Payment status is for this fund. Counts and confirmed amounts cover all welfare payment funds.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">{[{ label: 'Paid', value: directory.filter(person => person.status === 'Paid').length }, { label: 'Not paid', value: directory.filter(person => person.status !== 'Paid').length }, { label: 'Awaiting confirmation', value: directory.filter(person => person.status === 'Pending').length }].map(item => <div key={item.label} className="rounded-2xl border border-neutral-200 bg-white p-5"><p className="text-xs">{item.label}</p><p className="mt-2 text-3xl font-bold">{item.value}</p></div>)}</div>
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]"><label className="relative block"><span className="sr-only">Search welfare payment members</span><Search className="absolute left-3.5 top-3.5 h-4 w-4" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or membership number" className={`${inputClass} pl-10`} /></label><select aria-label="Filter welfare payment status" value={filter} onChange={event => setFilter(event.target.value)} className={inputClass}><option value="">All members</option><option value="Paid">Paid</option><option value="not-paid">Not paid</option><option value="Pending">Awaiting confirmation</option></select></div>
      {!members.length ? <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm">No members match these filters.</p> : <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white"><table className="w-full min-w-[560px] text-left text-sm [&_th]:normal-case [&_th]:tracking-normal"><caption className="sr-only">Members paid and not paid for {fund.title}</caption><thead className="bg-neutral-50"><tr>{['Member', 'Status', 'Contribution', 'Overall payments', 'Overall amount'].map(label => <th scope="col" key={label} className="px-4 py-4 text-xs font-semibold">{label}</th>)}</tr></thead><tbody>{members.map(person => <tr key={person.id} className="border-t border-neutral-100"><th scope="row" className="px-4 py-4"><span className="font-semibold">{person.fullName}</span>{person.membershipNumber && <span className="mt-1 block text-xs font-normal">{person.membershipNumber}</span>}</th><td className="px-4 py-4"><PaymentStatus status={person.status} /></td><td className="px-4 py-4">{formatNaira(person.amountKobo, true)}</td><td className="px-4 py-4 font-semibold">{person.welfarePaymentCount}</td><td className="px-4 py-4">{formatNaira(person.totalAmountKobo, true)}</td></tr>)}</tbody></table></div>}
    </>}
    <Link href="/members/dashboard?tab=payments&view=welfare" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1a472a] underline">View recorded donors and beneficiaries<ArrowRight className="h-4 w-4" /></Link>
  </section>;
}
