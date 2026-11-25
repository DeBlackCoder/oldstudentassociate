import type { IApplicant } from '@/lib/models/Applicant';
import { visibleAccountFilter } from '@/lib/utils/account-visibility';

export const submittedApplicationFilter = { ...visibleAccountFilter, paymentStatus: 'paid' as const, status: { $in: ['Pending', 'Approved', 'Rejected'] as IApplicant['status'][] } };
export function applicationStatusForMember(applicant: Pick<IApplicant, 'status' | 'paymentStatus' | 'paymentClaimStatus'> | null) {
  if (!applicant) return null;
  return applicant.status === 'Pending' && applicant.paymentStatus !== 'paid' && applicant.paymentClaimStatus !== 'pending' ? 'Saved' : applicant.status;
}
export function submissionFieldsOnPayment(applicant: Pick<IApplicant, 'status' | 'submittedAt'>, now = new Date()) {
  if (applicant.status === 'Saved') return { status: 'Pending' as const, submittedAt: now };
  if (applicant.status === 'Pending' && !applicant.submittedAt) return { status: 'Pending' as const, submittedAt: now };
  return {};
}
export function registrationFeeKobo() {
  const value = Number(process.env.MEMBERSHIP_FEE_KOBO || '200000');
  if (!Number.isSafeInteger(value) || value < 1) throw new Error('Invalid membership registration fee');
  return value;
}
