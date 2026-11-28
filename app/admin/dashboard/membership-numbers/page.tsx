'use client';

import { useEffect, useState } from 'react';
import { Hash, Loader2, Search, X } from 'lucide-react';

interface MemberNumber {
  id: string;
  fullName: string;
  email: string;
  membershipNumber: string;
  secondarySchool: string;
  graduationYear: number;
  verifiedAt?: string;
}

export default function MembershipNumbersPage() {
  const [members, setMembers] = useState<MemberNumber[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<MemberNumber | null>(null);
  const [membershipNumber, setMembershipNumber] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadMembers() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/admin/membership-numbers', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load members');
        if (!cancelled) setMembers(data.members);
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : 'Unable to load members');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadMembers();
    return () => { cancelled = true; };
  }, []);

  function openEditor(member: MemberNumber) {
    setSelected(member);
    setMembershipNumber(member.membershipNumber);
    setError('');
    setSuccess('');
  }

  async function saveNumber(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/admin/membership-numbers/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipNumber }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update membership number');
      setMembers(current => current.map(member => member.id === selected.id
        ? { ...member, membershipNumber: data.membershipNumber }
        : member));
      setSuccess(`Membership number changed to ${data.membershipNumber}.`);
      setSelected(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to update membership number');
    } finally {
      setSaving(false);
    }
  }

  const filtered = members.filter(member =>
    `${member.fullName} ${member.email} ${member.membershipNumber} ${member.secondarySchool}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><Hash className="h-6 w-6" />Membership numbers</h1>
        <p className="mt-1 text-sm text-white/60">Super Admin: search approved members and correct their membership numbers.</p>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {success && <p role="status" className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{success}</p>}
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-white p-2">
        <Search className="ml-2 h-4 w-4 text-black/40" />
        <input
          aria-label="Search membership numbers"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Name, email, school, or membership number"
          className="min-w-0 flex-1 rounded-lg px-2 py-2 text-sm text-black outline-none"
        />
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white">
        {loading ? (
          <div className="flex justify-center p-16 text-black"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !filtered.length ? (
          <p className="p-12 text-center text-sm text-black">No matching approved members.</p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm text-black">
            <thead className="border-b border-black/10">
              <tr>{['Membership number', 'Member', 'School', 'Approved', 'Action'].map(label =>
                <th key={label} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">{label}</th>
              )}</tr>
            </thead>
            <tbody>{filtered.map(member =>
              <tr key={member.id} className="border-b border-black/10 last:border-0">
                <td className="px-4 py-4 font-mono font-bold text-[#1a472a]">{member.membershipNumber}</td>
                <td className="px-4 py-4"><p className="font-semibold">{member.fullName}</p><p className="mt-1 text-xs text-black/60">{member.email}</p></td>
                <td className="px-4 py-4">{member.secondarySchool}<p className="mt-1 text-xs text-black/60">{member.graduationYear}</p></td>
                <td className="px-4 py-4 text-xs">{member.verifiedAt ? new Date(member.verifiedAt).toLocaleDateString('en-GB') : '-'}</td>
                <td className="px-4 py-4"><button type="button" onClick={() => openEditor(member)} className="rounded-lg border border-black/20 px-3 py-2 text-xs font-semibold hover:bg-black/5">Change number</button></td>
              </tr>
            )}</tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { if (!saving) setSelected(null); }}>
          <form role="dialog" aria-modal="true" aria-labelledby="membership-number-title" onSubmit={saveNumber} onClick={event => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 text-black shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 id="membership-number-title" className="text-lg font-bold">Change membership number</h2>
              <button type="button" disabled={saving} onClick={() => setSelected(null)} aria-label="Close dialog"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-2 text-sm">{selected.fullName}</p>
            <label className="mt-4 block text-sm font-medium">
              Membership number
              <input value={membershipNumber} onChange={event => setMembershipNumber(event.target.value)} required autoComplete="off" className="mt-2 w-full rounded-xl border border-black/20 px-3 py-2 font-mono uppercase" />
            </label>
            <p className="mt-2 text-xs text-black/60">Use RSSSOSA/YYYY/NNNN or RSSSOSAA/YYYY/NNNNN for legacy numbers.</p>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={saving} onClick={() => setSelected(null)} className="rounded-xl border border-black/20 px-4 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={saving || !membershipNumber.trim()} className="flex items-center gap-2 rounded-xl bg-[#1a472a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save number
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
