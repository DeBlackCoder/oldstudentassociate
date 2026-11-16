import type { DuesStatus } from './types';

const colours: Record<DuesStatus, string> = {
  Paid: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Pending: 'border-amber-200 bg-amber-50 text-amber-800',
  Unpaid: 'border-neutral-200 bg-neutral-100 text-neutral-600',
  Rejected: 'border-red-200 bg-red-50 text-red-800',
};
const darkColours: Record<DuesStatus, string> = {
  Paid: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  Pending: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  Unpaid: 'border-white/15 bg-white/5 text-white/60',
  Rejected: 'border-red-400/20 bg-red-400/10 text-red-200',
};

export default function PaymentStatus({ status, dark = false }: { status: DuesStatus; dark?: boolean }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${dark ? darkColours[status] : colours[status]}`}>{status}</span>;
}
