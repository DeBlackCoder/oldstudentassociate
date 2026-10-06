'use client';

import { useEffect, useState } from 'react';
import { Building2, CheckCircle, Save } from 'lucide-react';

interface BankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string;
  updatedBy?: string;
  updatedAt?: string;
}

export default function BankAccountPage() {
  const [account, setAccount] = useState<BankAccount>({
    bankName: '',
    accountName: '',
    accountNumber: '',
    sortCode: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/bank-account')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.account) {
          setAccount({
            bankName: data.account.bankName || '',
            accountName: data.account.accountName || '',
            accountNumber: data.account.accountNumber || '',
            sortCode: data.account.sortCode || '',
            updatedBy: data.account.updatedBy,
            updatedAt: data.account.updatedAt,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/admin/bank-account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Bank Account Settings</h1>
        <p className="text-white/60 text-sm">
          Set the bank account details shown to members who prefer bank transfers. Changes take effect immediately.
        </p>
      </div>

      <div className="max-w-xl">
        {/* Current display preview */}
        {account.accountNumber && (
          <div className="mb-6 rounded-2xl bg-[#1a472a] px-6 py-5 text-white"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-white/60" />
              <p className="text-xs text-white/60 uppercase tracking-widest font-semibold">Live Preview — What Members See</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Bank</span>
                <span className="font-semibold">{account.bankName || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Account Name</span>
                <span className="font-semibold">{account.accountName || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Account Number</span>
                <span className="font-bold text-lg tracking-widest">{account.accountNumber || '—'}</span>
              </div>
              {account.sortCode && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Sort Code</span>
                  <span className="font-semibold">{account.sortCode}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Account Details</h2>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-gray-400">Loading...</div>
          ) : (
            <form onSubmit={handleSave} className="px-6 py-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={account.bankName}
                  onChange={e => setAccount(p => ({ ...p, bankName: e.target.value }))}
                  required
                  placeholder="e.g. First Bank of Nigeria"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a472a]/20 focus:border-[#1a472a]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={account.accountName}
                  onChange={e => setAccount(p => ({ ...p, accountName: e.target.value }))}
                  required
                  placeholder="e.g. RSSSOSAA Membership Fund"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a472a]/20 focus:border-[#1a472a]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={account.accountNumber}
                  onChange={e => setAccount(p => ({ ...p, accountNumber: e.target.value }))}
                  required
                  placeholder="e.g. 0123456789"
                  maxLength={10}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a472a]/20 focus:border-[#1a472a]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Sort Code <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={account.sortCode}
                  onChange={e => setAccount(p => ({ ...p, sortCode: e.target.value }))}
                  placeholder="e.g. 011152"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a472a]/20 focus:border-[#1a472a]"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              {success && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Bank account details saved successfully.
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-full bg-[#1a472a] text-white font-semibold text-sm hover:bg-[#2d5f3f] transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Account Details'}
              </button>

              {account.updatedBy && (
                <p className="text-xs text-center text-gray-400">
                  Last updated by <span className="font-medium">{account.updatedBy}</span>
                  {account.updatedAt && ` on ${new Date(account.updatedAt).toLocaleDateString('en-GB')}`}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
