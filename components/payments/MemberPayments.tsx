'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, Clock3, CreditCard, HeartHandshake, Loader2, RefreshCw, Search, Users, X } from 'lucide-react';
import PaymentStatus from './PaymentStatus';
import { displayPaymentDate, formatNaira, quarterLabel, type DuesInvoice, type DuesStatus, type MemberDuesResponse } from './types';

export type PaymentView = 'dues' | 'directory' | 'welfare';
const inputClass = 'w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-800 outline-none focus:border-[#1a472a] focus:ring-2 focus:ring-[#1a472a]/10';
const nigeriaDate = () => new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
const greenButton = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#1a472a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d5f3f] disabled:cursor-not-allowed disabled:opacity-50';

async function readResponse(response: Response) {
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || data.message || 'Unable to complete this request. Please try again.');
  return data;
}

export default function MemberPayments({ initialView = 'dues' }: { initialView?: PaymentView }) {
  const [view, setView] = useState<PaymentView>(initialView);
  const [year, setYear] = useState(() => Number(nigeriaDate().slice(0, 4)));
  const [data, setData] = useState<MemberDuesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [welfareFilter, setWelfareFilter] = useState('');
  const [selected, setSelected] = useState<DuesInvoice | null>(null);
  const [method, setMethod] = useState<'paystack' | 'bank'>('paystack');
  const [busy, setBusy] = useState(false);
  const [bankReference, setBankReference] = useState('');
  const [senderName, setSenderName] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => fetch(`/api/member/dues?year=${year}`, { cache: 'no-store' })
    .then(readResponse)
    .then((next: MemberDuesResponse) => { setData(next); setError(''); })
    .catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load payments.'))
    .finally(() => setLoading(false)), [year]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selected) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('button, input')?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) setSelected(null);
      if (event.key !== 'Tab' || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('keydown', closeOnEscape); previousFocus?.focus(); };
  }, [selected, busy]);

  function changeYear(nextYear: number) {
    setYear(nextYear); setData(null); setLoading(true); setError(''); setMessage('');
  }
  function changeView(nextView: PaymentView) {
    setView(nextView); setSearch(''); setStatusFilter(''); setWelfareFilter('');
  }
  function openPayment(invoice: DuesInvoice) {
    setSelected(invoice); setMethod('paystack'); setBankReference(''); setSenderName(''); setTransferDate(''); setError(''); setMessage('');
  }
  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setError('');
    try {
      const result = await readResponse(await fetch('/api/member/dues', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: selected.year, quarter: selected.quarter, method, ...(method === 'bank' ? { bankReference: bankReference.trim(), senderName: senderName.trim(), transferDate } : {}) }),
      }));
      if (method === 'paystack') {
        const checkout = new URL(result.authorizationUrl);
        if (checkout.protocol !== 'https:' || !(checkout.hostname === 'paystack.com' || checkout.hostname.endsWith('.paystack.com'))) throw new Error('The payment provider returned an invalid checkout link. Please contact support.');
        window.location.assign(checkout.toString());
      } else {
        setSelected(null); setMessage('Your bank transfer has been submitted. An administrator will confirm it after checking the bank account.'); await load();
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to start payment.'); }
    finally { setBusy(false); }
  }

  const directory = data?.directory || [];
  const paidMembers = directory.filter(person => person.status === 'Paid' && !person.notYetDue).length;
  const pendingMembers = directory.filter(person => person.status === 'Pending').length;
  const unpaidMembers = directory.filter(person => person.status === 'Unpaid' || person.status === 'Rejected').length;
  const visibleMembers = directory.filter(person => (!statusFilter || (statusFilter === 'not-due' ? person.notYetDue : statusFilter === 'not-paid' ? !person.notYetDue && person.status !== 'Paid' : !person.notYetDue && person.status === statusFilter)) && `${person.fullName} ${person.membershipNumber || ''} ${person.secondarySchool || ''}`.toLowerCase().includes(search.toLowerCase()));
  const welfare = data?.welfare || [];
  const visibleWelfare = welfare.filter(person => person.fullName.toLowerCase().includes(search.toLowerCase()) && (!welfareFilter || (welfareFilter === 'contributors' ? person.contributionCount > 0 : welfareFilter === 'beneficiaries' ? person.benefitCount > 0 : person.contributionCount === 0)));
  const outstanding = (data?.dues || []).filter(invoice => invoice.status !== 'Paid');
  const availableYears = data?.availableYears?.length ? [...new Set([...data.availableYears, year])].sort((a, b) => b - a) : [year];

  return <section className="space-y-6 text-[#121417]">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#42664e]">Member contributions</p><h1 className="text-2xl font-bold text-[#173f26] sm:text-3xl">Payments & welfare</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">Keep your quarterly dues up to date and see the association’s contribution records.</p></div>
      <button type="button" onClick={() => { setLoading(true); void load(); }} disabled={loading || busy} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:border-[#1a472a]/40 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
    </div>
    <nav aria-label="Payment sections" className="flex gap-1 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-1.5">
      {([{ id: 'dues', title: 'My quarterly dues', icon: CreditCard }, { id: 'directory', title: 'Member payment status', icon: Users }, { id: 'welfare', title: 'Welfare contributions', icon: HeartHandshake }] as const).map(item => <button key={item.id} type="button" aria-current={view === item.id ? 'page' : undefined} onClick={() => changeView(item.id)} className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold transition sm:text-sm ${view === item.id ? 'bg-[#1a472a] text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-50'}`}><item.icon className="h-4 w-4" />{item.title}</button>)}
    </nav>
    {message && <p role="status" className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />{message}</p>}
    {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error} {!selected && <button type="button" onClick={load} className="ml-2 font-semibold underline">Retry</button>}</p>}
    {view !== 'welfare' && <label className="flex w-fit items-center gap-3 text-sm font-medium text-neutral-600">Contribution year<select aria-label="Contribution year" disabled={loading || busy} className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#173f26]" value={year} onChange={event => changeYear(Number(event.target.value))}>{availableYears.map(value => <option key={value}>{value}</option>)}</select></label>}
    {loading ? <div role="status" className="flex min-h-48 items-center justify-center gap-3 rounded-3xl border border-neutral-200 bg-white text-sm text-neutral-500"><Loader2 className="h-5 w-5 animate-spin text-[#1a472a]" />Loading contribution records…</div> : data && view === 'dues' ? <>
      <div className="relative overflow-hidden rounded-3xl bg-[#1a472a] p-6 text-white sm:p-8"><div className="absolute -right-12 -top-14 h-48 w-48 rounded-full border-[28px] border-white/5" aria-hidden="true" /><p className="relative text-sm text-white/70">Quarterly association dues</p><div className="relative mt-2 flex flex-wrap items-end gap-x-3 gap-y-1"><p className="text-4xl font-bold tracking-tight">{formatNaira(data.amountKobo, true)}</p><p className="pb-1 text-sm text-white/70">every three months</p></div><p className="relative mt-4 max-w-2xl text-sm leading-6 text-white/75">{formatNaira(data.annualAmountKobo, true)} for a full year. Paystack payments are confirmed automatically. Bank transfers are checked and confirmed by an administrator.</p><div className="relative mt-6 flex flex-wrap gap-3 text-xs font-semibold"><span className="rounded-full bg-white/10 px-3 py-2">{data.dues.filter(invoice => invoice.status === 'Paid').length} confirmed quarter{data.dues.filter(invoice => invoice.status === 'Paid').length === 1 ? '' : 's'}</span><span className="rounded-full bg-white/10 px-3 py-2">{outstanding.length} awaiting payment or confirmation</span></div></div>
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-[#173f26]">Your {year} dues</h2><span className="text-xs text-neutral-500">Quarters due so far</span></div>
      {!data.dues.length ? <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-600">No quarterly dues are due for your account in {year}. Your records will appear here when a contribution becomes due.</p> : <div className="grid gap-4 sm:grid-cols-2">{data.dues.map(invoice => <article key={`${invoice.year}-${invoice.quarter}`} className={`rounded-2xl border bg-white p-5 ${invoice.status === 'Paid' ? 'border-emerald-200' : 'border-neutral-200'}`}><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Quarter {invoice.quarter}</p><PaymentStatus status={invoice.status} /></div><h3 className="mb-1 mt-4 text-lg font-bold text-[#173f26]">{quarterLabel(invoice.quarter)}</h3><p className="text-sm text-neutral-500">{invoice.year}</p><p className="mb-4 mt-4 text-2xl font-bold">{formatNaira(invoice.amountKobo, true)}</p>{invoice.status === 'Paid' ? <p className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4" />Confirmed {displayPaymentDate(invoice.paidAt)}{invoice.paymentMethod && ` · ${invoice.paymentMethod === 'bank' ? 'Bank transfer' : 'Paystack'}`}</p> : invoice.status === 'Pending' ? <p className="flex items-start gap-2 text-xs leading-5 text-amber-800"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" />{invoice.paymentMethod === 'bank' ? 'Your bank transfer is awaiting administrator confirmation.' : 'Your Paystack payment is awaiting confirmation. Refresh after completing checkout.'}</p> : <button type="button" onClick={() => openPayment(invoice)} className={greenButton}>{invoice.status === 'Rejected' ? 'Submit a new payment' : 'Pay this quarter'}<ArrowRight className="h-4 w-4" /></button>}{invoice.adminNote && <p className="mt-4 rounded-xl bg-neutral-50 p-3 text-xs leading-5 text-neutral-600"><span className="font-semibold">Admin feedback: </span>{invoice.adminNote}</p>}</article>)}</div>}
      <p className="text-xs leading-5 text-neutral-500">Quarterly dues are separate from the one-time membership registration fee and paid event registrations. Paying dues does not change your membership application status.</p>
    </> : data && view === 'directory' ? <>
      <div className="grid gap-3 sm:grid-cols-3">{[{ label: 'Paid up', value: paidMembers, colour: 'text-emerald-700' }, { label: 'Awaiting confirmation', value: pendingMembers, colour: 'text-amber-700' }, { label: 'Dues outstanding', value: unpaidMembers, colour: 'text-neutral-700' }].map(stat => <div key={stat.label} className="rounded-2xl border border-neutral-200 bg-white p-5"><p className="text-xs text-neutral-500">{stat.label}</p><p className={`mt-2 text-3xl font-bold ${stat.colour}`}>{stat.value}</p></div>)}</div>
      <div><h2 className="text-lg font-bold text-[#173f26]">Member payment directory</h2><p className="mt-1.5 text-sm leading-6 text-neutral-600">Everyone can see confirmed payments and outstanding dues for {year}. Overall payment counts cover all years and include quarterly dues, registration, and paid events.</p></div>
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]"><label className="relative block"><span className="sr-only">Search members</span><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, school, or membership number" className={`${inputClass} pl-10`} /></label><label><span className="sr-only">Filter payment status</span><select className={inputClass} value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All payment statuses</option><option value="not-paid">Not paid up</option><option value="not-due">Not yet due</option>{(['Paid', 'Unpaid', 'Pending', 'Rejected'] as DuesStatus[]).map(status => <option key={status}>{status}</option>)}</select></label></div>
      <p className="text-xs text-neutral-500">{visibleMembers.length} member{visibleMembers.length === 1 ? '' : 's'} shown</p>
      {!visibleMembers.length ? <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">No members match these filters.</p> : <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white"><table className="w-full min-w-[640px] text-left text-sm [&_th]:normal-case [&_th]:tracking-normal"><caption className="sr-only">Association member payments for {year}</caption><thead className="bg-neutral-50 text-xs text-neutral-500"><tr>{['Member', `${year} status`, 'Paid quarters', 'Dues payments', 'Other payments', 'Overall count'].map(label => <th scope="col" key={label} className="px-4 py-4 font-semibold">{label}</th>)}</tr></thead><tbody>{visibleMembers.map(person => <tr key={person.id} className="border-t border-neutral-100"><th scope="row" className="px-4 py-4 font-medium"><p className="font-semibold text-[#173f26]">{person.fullName}</p>{person.membershipNumber && <p className="mt-1 text-xs font-normal text-neutral-500">{person.membershipNumber}</p>}{person.secondarySchool && <p className="mt-1 max-w-52 text-xs font-normal text-neutral-500">{person.secondarySchool}</p>}</th><td className="px-4 py-4">{person.notYetDue ? <span className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-500">Not yet due</span> : <PaymentStatus status={person.status} />}</td><td className="px-4 py-4 text-xs text-neutral-600">{person.paidQuarters.length ? person.paidQuarters.map(quarter => `Q${quarter}`).join(', ') : 'None'}</td><td className="px-4 py-4 font-semibold text-neutral-700">{person.duesPaymentCount}</td><td className="px-4 py-4 text-xs leading-5 text-neutral-500">{person.registrationPaymentCount} registration<br />{person.eventPaymentCount} event{person.eventPaymentCount === 1 ? '' : 's'}</td><td className="px-4 py-4"><span className="inline-flex min-w-9 justify-center rounded-full bg-[#E4EBDD] px-3 py-1.5 font-bold text-[#173f26]">{person.totalPaymentCount}</span></td></tr>)}</tbody></table></div>}
    </> : data && view === 'welfare' ? <>
      <div><h2 className="text-xl font-bold text-[#173f26]">Welfare contribution directory</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">See donors, beneficiaries, and the number of recorded contributions across published welfare initiatives. Welfare donations are voluntary; “No recorded contribution” means there is no donation entry, rather than an unpaid fee.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">{[{ label: 'Recorded donors', value: welfare.filter(person => person.contributionCount > 0).length }, { label: 'Contributions recorded', value: welfare.reduce((total, person) => total + person.contributionCount, 0) }, { label: 'Beneficiaries recorded', value: welfare.filter(person => person.benefitCount > 0).length }].map(stat => <div key={stat.label} className="rounded-2xl border border-neutral-200 bg-white p-5"><p className="text-xs text-neutral-500">{stat.label}</p><p className="mt-2 text-3xl font-bold text-[#173f26]">{stat.value}</p></div>)}</div>
      <div className="grid gap-3 sm:grid-cols-[1fr_240px]"><label className="relative block"><span className="sr-only">Search welfare names</span><Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search donors and beneficiaries" className={`${inputClass} pl-10`} /></label><label><span className="sr-only">Filter welfare records</span><select className={inputClass} value={welfareFilter} onChange={event => setWelfareFilter(event.target.value)}><option value="">All names</option><option value="contributors">Has contributed</option><option value="no-contribution">No recorded contribution</option><option value="beneficiaries">Beneficiaries</option></select></label></div>
      {!visibleWelfare.length ? <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">No welfare records match these filters.</p> : <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white"><table className="w-full min-w-[580px] text-left text-sm [&_th]:normal-case [&_th]:tracking-normal"><caption className="sr-only">All-time recorded welfare contributions and beneficiaries</caption><thead className="bg-neutral-50 text-xs text-neutral-500"><tr>{['Name', 'Contribution status', 'Times contributed', 'Recorded amount', 'Times benefited'].map(label => <th scope="col" key={label} className="px-4 py-4 font-semibold">{label}</th>)}</tr></thead><tbody>{visibleWelfare.map(person => <tr key={person.id} className="border-t border-neutral-100"><th scope="row" className="px-4 py-4 font-medium text-[#173f26]">{person.fullName}<span className="mt-1 block text-xs font-normal text-neutral-500">{person.isMember ? 'Member' : 'Community contributor / beneficiary'}</span></th><td className="px-4 py-4 text-xs">{person.contributionCount > 0 ? <span className="font-semibold text-emerald-700">Has contributed</span> : <span className="text-neutral-500">No recorded contribution</span>}</td><td className="px-4 py-4 font-semibold text-neutral-700">{person.contributionCount}</td><td className="px-4 py-4 text-neutral-600">{formatNaira(person.totalAmount)}</td><td className="px-4 py-4 font-semibold text-neutral-700">{person.benefitCount}</td></tr>)}</tbody></table></div>}
      <p className="text-xs leading-5 text-neutral-500">Administrators maintain these records in the Welfare section. Amount totals include only amounts recorded with donor entries.</p>
    </> : null}

    {selected && <div className="fixed inset-0 z-[210] flex items-center justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm" onClick={() => { if (!busy) setSelected(null); }}><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="quarter-payment-title" className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-[#F6F5F0] p-6 shadow-2xl sm:p-8" onClick={event => event.stopPropagation()}><button type="button" aria-label="Close payment dialog" disabled={busy} onClick={() => setSelected(null)} className="absolute right-4 top-4 rounded-full p-2 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 disabled:opacity-50"><X className="h-5 w-5" /></button><p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#42664e]">Association dues</p><h2 id="quarter-payment-title" className="pr-8 text-2xl font-bold text-[#173f26]">Quarter {selected.quarter} · {selected.year}</h2><p className="mt-1 text-sm text-neutral-500">{quarterLabel(selected.quarter)}</p><p className="my-5 text-3xl font-bold text-[#173f26]">{formatNaira(selected.amountKobo, true)}</p>
      <form onSubmit={submitPayment} className="space-y-5"><fieldset disabled={busy} className="space-y-5"><legend className="mb-3 text-sm font-semibold text-neutral-700">Choose a payment method</legend><div className="grid grid-cols-2 gap-3">{([{ id: 'paystack', label: 'Paystack', icon: CreditCard, description: 'Automatic confirmation' }, { id: 'bank', label: 'Bank transfer', icon: Building2, description: 'Admin confirmation' }] as const).map(option => <label key={option.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 ${method === option.id ? 'border-[#1a472a] bg-[#E4EBDD]/60' : 'border-neutral-200 bg-white'}`}><input type="radio" name="payment-method" value={option.id} checked={method === option.id} onChange={() => setMethod(option.id)} className="mt-1 accent-[#1a472a]" /><span><option.icon className="mb-2 h-5 w-5 text-[#1a472a]" /><span className="block text-sm font-bold">{option.label}</span><span className="mt-1 block text-xs leading-5 text-neutral-500">{option.description}</span></span></label>)}</div>
      {method === 'paystack' ? <p className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm leading-6 text-neutral-600">Continue to Paystack to complete payment securely. Your record updates automatically when Paystack confirms the transaction.</p> : data?.bankAccount ? <><dl className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 text-sm">{[['Bank', data.bankAccount.bankName], ['Account name', data.bankAccount.accountName], ['Account number', data.bankAccount.accountNumber], ['Amount to transfer', formatNaira(selected.amountKobo, true)]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-neutral-500">{label}</dt><dd className="font-semibold text-[#173f26]">{value}</dd></div>)}</dl><p className="text-xs leading-5 text-neutral-500">Make the transfer first, then enter its details below. Submission is a request for confirmation.</p><label className="block text-sm font-medium text-neutral-600">Sender’s account name<input autoComplete="name" required minLength={3} maxLength={200} value={senderName} onChange={event => setSenderName(event.target.value)} className={`${inputClass} mt-1.5`} /></label><label className="block text-sm font-medium text-neutral-600">Transfer / transaction reference<input required minLength={3} maxLength={150} value={bankReference} onChange={event => setBankReference(event.target.value)} className={`${inputClass} mt-1.5`} /></label><label className="block text-sm font-medium text-neutral-600">Transfer date<input required type="date" max={nigeriaDate()} value={transferDate} onChange={event => setTransferDate(event.target.value)} className={`${inputClass} mt-1.5`} /></label></> : <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">The association’s bank account has not been configured. Use Paystack or contact the administrator for assistance.</p>}
      </fieldset>{error && <p role="alert" className="text-sm leading-6 text-red-700">{error}</p>}<button disabled={busy || (method === 'bank' && !data?.bankAccount)} className={`${greenButton} w-full py-3.5`}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" />{method === 'bank' ? 'Submitting transfer…' : 'Opening Paystack…'}</> : <>{method === 'bank' ? 'Submit transfer for confirmation' : 'Continue to Paystack'}<ArrowRight className="h-4 w-4" /></>}</button><button type="button" disabled={busy} onClick={() => setSelected(null)} className="w-full py-1 text-sm text-neutral-500 underline">Cancel</button></form>
    </div></div>}
  </section>;
}
