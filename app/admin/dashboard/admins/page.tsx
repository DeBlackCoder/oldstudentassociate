'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Plus, Shield, ShieldOff, Trash2, UserCog, X } from 'lucide-react';

interface AdminUser {
  _id: string;
  fullName: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Verifier';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    'Super Admin': 'bg-purple-100 text-purple-800 border-purple-200',
    Admin: 'bg-blue-100 text-blue-800 border-blue-200',
    Verifier: 'bg-green-100 text-green-800 border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[role] || 'bg-gray-100 text-gray-700'}`}>
      {role}
    </span>
  );
}

function ConfirmModal({ open, onClose, title, description, confirmLabel, confirmClass, loading, onConfirm }: {
  open: boolean; onClose: () => void; title: string; description: string;
  confirmLabel: string; confirmClass: string; loading: boolean; onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50" style={{ backdropFilter: 'blur(4px)' }}
            onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.16 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl"
            style={{ background: '#1a1f2a', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-white font-semibold text-lg mb-2">{title}</h2>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">{description}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-all disabled:opacity-50">
                Cancel
              </button>
              <button onClick={onConfirm} disabled={loading}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 ${confirmClass}`}>
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'Admin' });
  const [showPass, setShowPass] = useState(false);
  const [createError, setCreateError] = useState('');

  // Confirm modals
  const [confirmAction, setConfirmAction] = useState<null | { type: 'deactivate' | 'activate' | 'delete' | 'role'; admin: AdminUser; newRole?: string }>(null);

  useEffect(() => { fetchAdmins(); }, []);

  async function fetchAdmins() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/admins');
      const data = await res.json();
      if (res.ok && data.success) { setAdmins(data.admins); setIsSuperAdmin(data.isSuperAdmin); }
      else setError(data.error || 'Failed to load admins');
    } catch { setError('Failed to load admins'); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || 'Failed to create admin'); return; }
      setSuccess(`Admin account created for ${form.email}`);
      setShowCreate(false);
      setForm({ fullName: '', email: '', password: '', role: 'Admin' });
      fetchAdmins();
    } catch { setCreateError('Something went wrong'); }
    finally { setActionLoading(false); }
  }

  async function handleConfirm() {
    if (!confirmAction) return;
    setActionLoading(true);
    setError('');
    try {
      const { type, admin, newRole } = confirmAction;
      if (type === 'role' && newRole) {
        const res = await fetch(`/api/admin/admins/${admin._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed to update role'); return; }
        setSuccess(`${admin.fullName} is now ${newRole}`);
      } else if (type === 'deactivate') {
        const res = await fetch(`/api/admin/admins/${admin._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed'); return; }
        setSuccess(`${admin.fullName} deactivated`);
      } else if (type === 'activate') {
        const res = await fetch(`/api/admin/admins/${admin._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed'); return; }
        setSuccess(`${admin.fullName} activated`);
      } else if (type === 'delete') {
        const res = await fetch(`/api/admin/admins/${admin._id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed'); return; }
        setSuccess(`${admin.fullName} removed`);
      }
      setConfirmAction(null);
      fetchAdmins();
      setTimeout(() => setSuccess(''), 4000);
    } catch { setError('Something went wrong'); }
    finally { setActionLoading(false); }
  }

  const getConfirmProps = () => {
    if (!confirmAction) return null;
    const { type, admin, newRole } = confirmAction;
    if (type === 'role') return { title: 'Change Role', description: `Change ${admin.fullName}'s role to "${newRole}"?`, confirmLabel: 'Change Role', confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white' };
    if (type === 'deactivate') return { title: 'Deactivate Admin', description: `Deactivate ${admin.fullName}? They will lose access immediately.`, confirmLabel: 'Deactivate', confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white' };
    if (type === 'activate') return { title: 'Activate Admin', description: `Re-activate ${admin.fullName}'s account?`, confirmLabel: 'Activate', confirmClass: 'bg-[#1a472a] hover:bg-[#2d5f3f] text-white' };
    if (type === 'delete') return { title: 'Revoke Admin Access', description: `Remove ${admin.fullName}'s administrator access? Their regular member account, profile, and payments will remain available.`, confirmLabel: 'Revoke Access', confirmClass: 'bg-red-600 hover:bg-red-700 text-white' };
    return null;
  };

  const cp = getConfirmProps();

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Management</h1>
          <p className="text-white/40 text-sm mt-0.5">
            {isSuperAdmin ? 'Manage all admin accounts' : 'View admin accounts'}
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex flex-wrap gap-2">
          <Link href="/admin/dashboard/users" className="flex items-center gap-2 h-9 px-4 rounded-xl border border-white/20 text-white text-sm font-semibold">Promote member</Link>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[#1a472a] text-white text-sm font-semibold hover:bg-[#2d5f3f] transition-all">
            <Plus className="h-4 w-4" /> Add Admin
          </button>
          </div>
        )}
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}
      {success && <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400">{success}</div>}

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-white/30" />
          </div>
        ) : admins.length === 0 ? (
          <div className="py-16 text-center text-white/30 text-sm">No admin accounts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="dashboard-light-surface w-full bg-white">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Admin', 'Role', 'Status', 'Last Login', isSuperAdmin ? 'Actions' : ''].filter(Boolean).map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-medium text-white/30 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#1a472a] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {admin.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white/80 text-sm font-medium">{admin.fullName}</p>
                          <p className="text-white/30 text-xs">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <RoleBadge role={admin.role} />
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${admin.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${admin.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white/30 text-xs">
                      {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString('en-GB') : 'Never'}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-5 py-4">
                        {admin.role !== 'Super Admin' && (
                          <div className="flex items-center gap-2">
                            {/* Promote/Demote */}
                            {admin.role === 'Admin' ? (
                              <button onClick={() => setConfirmAction({ type: 'role', admin, newRole: 'Verifier' })}
                                title="Demote to Verifier"
                                className="p-1.5 rounded-lg text-white/30 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                                <UserCog className="h-4 w-4" />
                              </button>
                            ) : (
                              <button onClick={() => setConfirmAction({ type: 'role', admin, newRole: 'Admin' })}
                                title="Promote to Admin"
                                className="p-1.5 rounded-lg text-white/30 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                                <Shield className="h-4 w-4" />
                              </button>
                            )}
                            {/* Activate / Deactivate */}
                            {admin.isActive ? (
                              <button onClick={() => setConfirmAction({ type: 'deactivate', admin })}
                                title="Deactivate"
                                className="p-1.5 rounded-lg text-white/30 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                                <ShieldOff className="h-4 w-4" />
                              </button>
                            ) : (
                              <button onClick={() => setConfirmAction({ type: 'activate', admin })}
                                title="Activate"
                                className="p-1.5 rounded-lg text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
                                <Shield className="h-4 w-4" />
                              </button>
                            )}
                            {/* Delete */}
                            <button onClick={() => setConfirmAction({ type: 'delete', admin })}
                              title="Remove"
                              className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create admin modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50" style={{ backdropFilter: 'blur(4px)' }}
              onClick={() => setShowCreate(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.16 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl overflow-hidden"
              style={{ background: '#1a1f2a', border: '1px solid rgba(255,255,255,0.08)' }}>

              <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <h2 className="text-white font-semibold text-lg">Create Admin Account</h2>
                <button onClick={() => setShowCreate(false)} className="text-white/30 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="px-6 py-6 space-y-4">
                <p className="text-sm text-white/60">To promote an existing member while keeping their password, use <Link href="/admin/dashboard/users" className="underline text-white">User accounts</Link>.</p>
                <div>
                  <label className="block text-xs text-white/50 font-medium mb-1.5 uppercase tracking-wide">Full Name</label>
                  <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required
                    placeholder="e.g. Jane Doe"
                    className="w-full h-10 rounded-xl px-3 text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#1a472a]/40 focus:border-[#1a472a]/50 placeholder:text-white/20" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 font-medium mb-1.5 uppercase tracking-wide">Email Address</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
                    placeholder="admin@example.com"
                    className="w-full h-10 rounded-xl px-3 text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#1a472a]/40 focus:border-[#1a472a]/50 placeholder:text-white/20" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 font-medium mb-1.5 uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required
                      placeholder="Min 8 characters"
                      className="w-full h-10 rounded-xl px-3 pr-10 text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#1a472a]/40 focus:border-[#1a472a]/50 placeholder:text-white/20" />
                    <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/50 font-medium mb-1.5 uppercase tracking-wide">Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full h-10 rounded-xl px-3 text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#1a472a]/40">
                    <option value="Admin" className="bg-[#1a1f2a]">Admin</option>
                    <option value="Verifier" className="bg-[#1a1f2a]">Verifier</option>
                  </select>
                </div>

                {createError && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">{createError}</div>}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} disabled={actionLoading}
                    className="flex-1 h-10 rounded-xl text-sm font-medium text-white/60 border border-white/10 hover:border-white/20 hover:text-white transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={actionLoading}
                    className="flex-1 h-10 rounded-xl text-sm font-semibold bg-[#1a472a] text-white hover:bg-[#2d5f3f] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Create Admin
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm modal */}
      {cp && (
        <ConfirmModal
          open={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          title={cp.title}
          description={cp.description}
          confirmLabel={cp.confirmLabel}
          confirmClass={cp.confirmClass}
          loading={actionLoading}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
