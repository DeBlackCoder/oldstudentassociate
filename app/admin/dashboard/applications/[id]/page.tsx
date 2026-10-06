'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ── Reusable confirmation modal (no Base UI dependency) ──────────────
function ConfirmModal({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmClass = 'bg-[#1a472a] hover:bg-[#2d5f3f] text-white',
  loading = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmClass?: string;
  loading?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/50"
            style={{ backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl"
            style={{ background: '#1a1f2a', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <h2 className="text-white font-semibold text-lg mb-2">{title}</h2>
            {description && <p className="text-white/60 text-sm mb-4 leading-relaxed">{description}</p>}
            {children && <div className="mb-4">{children}</div>}
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={cn('px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50', confirmClass)}
              >
                {loading ? 'Please wait...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Types ────────────────────────────────────────────────────────────
interface ApplicationDetails {
  _id: string;
  applicationRef: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  residentialAddress: string;
  stateOfOrigin: string;
  lga: string;
  secondarySchool: string;
  graduationYear: number;
  positionHeldInSchool?: string;
  currentOccupation: string;
  employmentType: string;
  organizationName?: string;
  skills: string[];
  willingToParticipate: boolean;
  contributionAreas: string[];
  otherContributionArea?: string;
  signature: string;
  signatureDate: string;
  status: string;
  membershipNumber?: string;
  adminRemarks?: string;
  submittedAt: string;
  paymentStatus?: string;
  paymentRef?: string;
  paidAt?: string;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn(
      'rounded-full px-3 py-1 text-sm',
      status === 'Pending' && 'bg-yellow-100 text-yellow-800 border-yellow-200',
      status === 'Approved' && 'bg-green-100 text-green-800 border-green-200',
      status === 'Rejected' && 'bg-red-100 text-red-800 border-red-200',
    )}>
      {status}
    </Badge>
  );
}

function InfoRow({ label, value }: { label: string; value: string | string[] | number | boolean }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm font-medium text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-base text-gray-900">
        {Array.isArray(value) ? (value.length > 0 ? value.join(', ') : 'Not specified')
          : typeof value === 'boolean' ? (value ? 'Yes' : 'No')
          : (value || 'Not specified')}
      </dd>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [actionError, setActionError] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [markPaidNote, setMarkPaidNote] = useState('');

  useEffect(() => {
    if (params?.id) fetchApplication();
  }, [params]);

  async function fetchApplication() {
    try {
      const res = await fetch(`/api/admin/applications/${params?.id}`);
      const data = await res.json();
      if (data.success) {
        setApplication(data.application);
        setRemarks(data.application.adminRemarks || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove() {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/admin/applications/${params?.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks }),
      });
      const data = await res.json();
      if (data.success) {
        setShowApproveModal(false);
        router.push('/admin/dashboard/applications');
      } else {
        setActionError(data.error || 'Approval failed');
        setShowApproveModal(false);
      }
    } catch {
      setActionError('An error occurred');
      setShowApproveModal(false);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!remarks.trim()) { setActionError('Remarks are required for rejection'); return; }
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/admin/applications/${params?.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRejectModal(false);
        router.push('/admin/dashboard/applications');
      } else {
        setActionError(data.error || 'Rejection failed');
        setShowRejectModal(false);
      }
    } catch {
      setActionError('An error occurred');
      setShowRejectModal(false);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMarkPaid() {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/admin/applications/${params?.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: markPaidNote }),
      });
      const data = await res.json();
      if (data.success) {
        setShowMarkPaidModal(false);
        fetchApplication();
      } else {
        setActionError(data.error || 'Failed to mark as paid');
        setShowMarkPaidModal(false);
      }
    } catch {
      setActionError('An error occurred');
      setShowMarkPaidModal(false);
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full rounded-xl" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <p className="text-white/60 mb-4">Application not found</p>
        <button onClick={() => router.back()} className="text-[#1a472a] hover:underline text-sm">Go back</button>
      </div>
    );
  }

  const card = 'bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden';
  const cardHeader = 'px-6 py-4 border-b border-gray-100';
  const cardTitle = 'text-base font-semibold text-gray-900';
  const cardBody = 'px-6 py-4';

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="text-sm text-[#1a472a] hover:underline mb-1.5 inline-block">
            ← Back to applications
          </button>
          <h1 className="text-2xl font-bold text-white">Application Details</h1>
        </div>
        <StatusBadge status={application.status} />
      </div>

      {actionError && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{actionError}</div>
      )}

      {/* Ref card */}
      <div className={card}>
        <div className={cn(cardBody, 'grid grid-cols-1 md:grid-cols-3 gap-4')}>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Application Ref</p>
            <p className="font-mono font-semibold text-gray-900 text-sm">{application.applicationRef}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Submitted</p>
            <p className="text-gray-900 text-sm">{new Date(application.submittedAt).toLocaleDateString('en-GB')}</p>
          </div>
          {application.membershipNumber && (
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Membership No.</p>
              <p className="font-mono font-semibold text-green-700 text-sm">{application.membershipNumber}</p>
            </div>
          )}
        </div>
      </div>

      {/* Personal */}
      <div className={card}>
        <div className={cardHeader}><h2 className={cardTitle}>Personal Information</h2></div>
        <div className={cardBody}>
          <dl>
            <InfoRow label="Full Name" value={application.fullName} />
            <InfoRow label="Date of Birth" value={new Date(application.dateOfBirth).toLocaleDateString('en-GB')} />
            <InfoRow label="Gender" value={application.gender} />
            <InfoRow label="Phone Number" value={application.phoneNumber} />
            <InfoRow label="WhatsApp" value={application.whatsappNumber} />
            <InfoRow label="Email" value={application.email} />
            <InfoRow label="Address" value={application.residentialAddress} />
            <InfoRow label="State of Origin" value={application.stateOfOrigin} />
            <InfoRow label="LGA" value={application.lga} />
          </dl>
        </div>
      </div>

      {/* School */}
      <div className={card}>
        <div className={cardHeader}><h2 className={cardTitle}>School Information</h2></div>
        <div className={cardBody}>
          <dl>
            <InfoRow label="Secondary School" value={application.secondarySchool} />
            <InfoRow label="Graduation Year" value={application.graduationYear} />
            <InfoRow label="Position Held" value={application.positionHeldInSchool || 'None'} />
          </dl>
        </div>
      </div>

      {/* Professional */}
      <div className={card}>
        <div className={cardHeader}><h2 className={cardTitle}>Professional Information</h2></div>
        <div className={cardBody}>
          <dl>
            <InfoRow label="Current Occupation" value={application.currentOccupation} />
            <InfoRow label="Employment Type" value={application.employmentType} />
            {application.organizationName && <InfoRow label="Organisation" value={application.organizationName} />}
            <InfoRow label="Skills" value={application.skills} />
          </dl>
        </div>
      </div>

      {/* Participation */}
      <div className={card}>
        <div className={cardHeader}><h2 className={cardTitle}>Participation</h2></div>
        <div className={cardBody}>
          <dl>
            <InfoRow label="Willing to Participate" value={application.willingToParticipate} />
            {application.willingToParticipate && (
              <>
                <InfoRow label="Contribution Areas" value={application.contributionAreas} />
                {application.otherContributionArea && <InfoRow label="Other" value={application.otherContributionArea} />}
              </>
            )}
          </dl>
        </div>
      </div>

      {/* Declaration */}
      <div className={card}>
        <div className={cardHeader}><h2 className={cardTitle}>Declaration</h2></div>
        <div className={cardBody}>
          <dl>
            <InfoRow label="Signature" value={application.signature} />
            <InfoRow label="Date" value={new Date(application.signatureDate).toLocaleDateString('en-GB')} />
          </dl>
        </div>
      </div>

      {/* Payment */}
      <div className={card}>
        <div className={cardHeader}><h2 className={cardTitle}>Payment Status</h2></div>
        <div className={cn(cardBody, 'flex items-center justify-between')}>
          <div>
            <Badge className={cn('rounded-full px-3 py-1 text-sm',
              application.paymentStatus === 'paid' && 'bg-green-100 text-green-800',
              application.paymentStatus === 'failed' && 'bg-red-100 text-red-800',
              (!application.paymentStatus || application.paymentStatus === 'unpaid') && 'bg-yellow-100 text-yellow-800',
            )}>
              {application.paymentStatus === 'paid' ? '✓ Paid' : application.paymentStatus === 'failed' ? '✗ Failed' : '⏳ Unpaid'}
            </Badge>
            {application.paymentRef && <p className="text-xs text-gray-400 mt-1 font-mono">{application.paymentRef}</p>}
            {application.paidAt && <p className="text-xs text-gray-400 mt-0.5">Paid {new Date(application.paidAt).toLocaleDateString('en-GB')}</p>}
          </div>
          {application.paymentStatus !== 'paid' && application.status === 'Pending' && (
            <button onClick={() => setShowMarkPaidModal(true)}
              className="rounded-full border-2 border-[#1a472a] text-[#1a472a] px-4 py-1.5 text-sm font-semibold hover:bg-[#1a472a] hover:text-white transition-all">
              Mark as Paid
            </button>
          )}
        </div>
      </div>

      {/* Admin remarks (non-pending) */}
      {application.adminRemarks && application.status !== 'Pending' && (
        <div className="mb-6 rounded-xl bg-gray-50 border border-gray-200 px-5 py-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Admin Remarks</p>
          <p className="text-sm text-gray-600">{application.adminRemarks}</p>
        </div>
      )}

      {/* Actions */}
      {application.status === 'Pending' && (
        <div className={card}>
          <div className={cardHeader}><h2 className={cardTitle}>Admin Actions</h2></div>
          <div className={cardBody}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Remarks / Notes</label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
                placeholder="Add any remarks about this application..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a472a]/20 focus:border-[#1a472a] resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(true)}
                disabled={actionLoading}
                className="flex-1 h-10 rounded-xl bg-[#1a472a] text-white font-semibold text-sm hover:bg-[#2d5f3f] transition-all disabled:opacity-50"
              >
                Approve Application
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="flex-1 h-10 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-all disabled:opacity-50"
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────── */}
      <ConfirmModal
        open={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Application?"
        description={`You are about to approve ${application.fullName}'s application. A membership number will be generated automatically. This cannot be undone.`}
        confirmLabel="Yes, Approve"
        confirmClass="bg-[#1a472a] hover:bg-[#2d5f3f] text-white"
        loading={actionLoading}
        onConfirm={handleApprove}
      />

      <ConfirmModal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Application?"
        description={`You are about to reject ${application.fullName}'s application. Please ensure you have added a reason in the remarks field.`}
        confirmLabel="Yes, Reject"
        confirmClass="bg-red-600 hover:bg-red-700 text-white"
        loading={actionLoading}
        onConfirm={handleReject}
      >
        {!remarks.trim() && (
          <p className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            ⚠ Please add a reason in the remarks field before rejecting.
          </p>
        )}
      </ConfirmModal>

      <ConfirmModal
        open={showMarkPaidModal}
        onClose={() => setShowMarkPaidModal(false)}
        title="Mark Payment as Received?"
        description={`Confirm you have received the ₦2,000 membership fee from ${application.fullName} via bank transfer. This action is logged.`}
        confirmLabel="Confirm Payment"
        confirmClass="bg-[#1a472a] hover:bg-[#2d5f3f] text-white"
        loading={actionLoading}
        onConfirm={handleMarkPaid}
      >
        <div>
          <label className="block text-xs text-white/50 font-medium mb-1.5">Internal Note (optional)</label>
          <input
            value={markPaidNote}
            onChange={e => setMarkPaidNote(e.target.value)}
            placeholder="e.g. Transfer ref TRF123456 on 01/10/2026"
            className="w-full h-10 rounded-xl px-3 text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#1a472a]/30 focus:border-[#1a472a]/50 placeholder:text-white/25"
          />
        </div>
      </ConfirmModal>
    </div>
  );
}
