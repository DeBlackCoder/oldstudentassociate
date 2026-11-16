'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, ShieldPlus, Trash2, Users, X } from 'lucide-react';

interface UserAccount {
  id: string; email: string; fullName: string; emailVerified: boolean; profileComplete: boolean;
  createdAt: string; applicationRef?: string; applicationStatus: string; registrationPaymentStatus: string;
  membershipNumber?: string; canDelete: boolean; admin: { id: string; role: string; isActive: boolean } | null;
}
type Action = { type: 'promote' | 'delete'; account: UserAccount };

export default function UserAccountsPage() {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [searchText, setSearchText] = useState(''), [search, setSearch] = useState('');
  const [page, setPage] = useState(1), [pages, setPages] = useState(1), [total, setTotal] = useState(0);
  const [action, setAction] = useState<Action | null>(null);
  const [role, setRole] = useState<'Admin' | 'Verifier'>('Admin'), [confirmationEmail, setConfirmationEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/accounts?page=${page}&search=${encodeURIComponent(search)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load accounts');
      setAccounts(data.accounts); setPages(data.pages); setTotal(data.total);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to load accounts'); }
    finally { setLoading(false); }
  }, [page, search]);
  useEffect(() => { void load(); }, [load]);

  function openAction(type: Action['type'], account: UserAccount) {
    setRole(account.admin?.role === 'Verifier' ? 'Verifier' : 'Admin'); setConfirmationEmail(''); setError(''); setAction({ type, account });
  }
  async function confirmAction(event: React.FormEvent) {
    event.preventDefault(); if (!action) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const deleting = action.type === 'delete';
      const response = await fetch(`/api/admin/accounts/${action.account.id}${deleting ? '' : '/role'}`, {
        method: deleting ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(deleting ? { confirmationEmail } : { role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update account');
      setSuccess(deleting ? 'Account deleted. Payment history is retained for accounting.' : `${action.account.fullName} now has ${role} access. Their existing password and profile are preserved.`);
      setAction(null); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to update account'); }
    finally { setSaving(false); }
  }

  return <div className="max-w-6xl">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-white">User accounts</h1><p className="mt-1 text-sm text-white/60">Manage member accounts, registration progress, and administrator access.</p></div>
      <Link href="/admin/dashboard/admins" className="rounded-xl bg-[#1a472a] px-4 py-2 text-sm font-semibold text-white">Manage admins</Link>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    {success && <p role="status" className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{success}</p>}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-sm text-white/70"><Users className="h-4 w-4" />{total} user accounts</p>
      <form onSubmit={event => { event.preventDefault(); setPage(1); setSearch(searchText.trim()); }} className="flex max-w-full gap-2">
        <input aria-label="Search users by name or email" value={searchText} onChange={event => setSearchText(event.target.value)} placeholder="Name or email" className="min-w-0 rounded-xl border border-white/20 bg-white px-3 py-2 text-sm text-black" />
        <button type="submit" aria-label="Search users" className="rounded-xl bg-[#1a472a] px-3 text-white"><Search className="h-4 w-4" /></button>
      </form>
    </div>
    <div className="overflow-x-auto rounded-2xl bg-white">
      {loading ? <div className="flex justify-center p-16 text-black"><Loader2 className="h-6 w-6 animate-spin" /></div> : !accounts.length ? <p className="p-12 text-center text-sm text-black">No matching accounts.</p> : <table className="w-full min-w-[760px] text-left text-sm text-black">
        <thead className="border-b border-black/10"><tr>{['Member', 'Registration', 'Account access', 'Joined', 'Actions'].map(label => <th key={label} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">{label}</th>)}</tr></thead>
        <tbody>{accounts.map(account => <tr key={account.id} className="border-b border-black/10 last:border-0">
          <td className="px-4 py-4"><p className="font-semibold">{account.fullName}</p><p className="mt-1 break-all text-xs">{account.email}</p>{account.membershipNumber && <p className="mt-1 text-xs">{account.membershipNumber}</p>}</td>
          <td className="px-4 py-4"><p>{account.applicationStatus}</p><p className="mt-1 text-xs">Registration fee: {account.registrationPaymentStatus === 'paid' ? 'Confirmed' : 'Not paid'}</p><p className="mt-1 text-xs">Email {account.emailVerified ? 'verified' : 'unverified'} · Form {account.profileComplete ? 'saved' : 'incomplete'}</p></td>
          <td className="px-4 py-4">{account.admin ? `${account.admin.role}${account.admin.isActive ? '' : ' · inactive'}` : 'Member'}</td>
          <td className="px-4 py-4 text-xs">{new Date(account.createdAt).toLocaleDateString('en-GB')}</td>
          <td className="px-4 py-4"><div className="flex flex-wrap gap-2">
            {account.canDelete && account.admin?.role !== 'Super Admin' && <button onClick={() => openAction('promote', account)} className="flex items-center gap-1 rounded-lg border border-black/20 px-2 py-1.5 text-xs font-semibold"><ShieldPlus className="h-3.5 w-3.5" />{account.admin ? 'Edit access' : 'Make admin'}</button>}
            {account.canDelete && <button onClick={() => openAction('delete', account)} className="flex items-center gap-1 rounded-lg border border-black/20 px-2 py-1.5 text-xs font-semibold"><Trash2 className="h-3.5 w-3.5" />Delete account</button>}
          </div></td>
        </tr>)}</tbody>
      </table>}
    </div>
    {pages > 1 && <div className="mt-4 flex items-center justify-end gap-3 text-sm text-white"><button disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-white/20 px-3 py-1.5 disabled:opacity-40">Previous</button><span>Page {page} of {pages}</span><button disabled={page >= pages || loading} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-white/20 px-3 py-1.5 disabled:opacity-40">Next</button></div>}
    {action && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { if (!saving) setAction(null); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="account-action-title" onSubmit={confirmAction} onClick={event => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 text-black shadow-xl">
        <div className="flex items-start justify-between gap-3"><h2 id="account-action-title" className="text-lg font-bold">{action.type === 'delete' ? 'Delete account' : 'Administrator access'}</h2><button type="button" disabled={saving} onClick={() => setAction(null)} aria-label="Close dialog"><X className="h-5 w-5" /></button></div>
        <p className="mt-2 break-all text-sm">{action.account.fullName} · {action.account.email}</p>
        {action.type === 'delete' ? <><p className="mt-4 text-sm leading-relaxed">This removes sign-in access and personal profile details. Confirmed payment amounts and references stay in the accounting records.</p><label className="mt-4 block text-sm font-medium">Type their email to confirm<input type="email" required value={confirmationEmail} onChange={event => setConfirmationEmail(event.target.value)} autoComplete="off" className="mt-2 w-full rounded-xl border border-black/20 bg-white px-3 py-2 text-black" /></label></> : <><p className="mt-4 text-sm">The member keeps their existing password, form, and payments.</p><label className="mt-4 block text-sm font-medium">Role<select value={role} onChange={event => setRole(event.target.value as 'Admin' | 'Verifier')} className="mt-2 w-full rounded-xl border border-black/20 bg-white px-3 py-2 text-black"><option>Admin</option><option>Verifier</option></select></label><p className="mt-2 text-xs">Admins manage the portal. Verifiers review applications without managing payment settings or content.</p></>}
        {error && <p role="alert" className="mt-3 text-sm text-black">{error}</p>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setAction(null)} disabled={saving} className="rounded-xl border border-black/20 px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={saving || (action.type === 'delete' && confirmationEmail.trim().toLowerCase() !== action.account.email.toLowerCase())} className="flex items-center gap-2 rounded-xl bg-[#1a472a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{action.type === 'delete' ? 'Delete account' : 'Save access'}</button></div>
      </form>
    </div>}
  </div>;
}
