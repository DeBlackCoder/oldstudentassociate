import Applicant from '@/lib/models/Applicant';
import { HttpError } from '@/lib/community/server';
import type { PaystackTransaction } from './policy';
import { submissionFieldsOnPayment } from '@/lib/registration/policy';

export async function confirmMembershipTransaction(transaction: PaystackTransaction, expectedApplicantId?: string) {
  const applicant = await Applicant.findOne({ $or: [
    { paymentRef: transaction.reference },
    ...(transaction.metadata?.applicationRef ? [{ applicationRef: transaction.metadata.applicationRef }] : []),
    { applicationRef: transaction.reference.replace(/-/g, '/') },
  ] });
  if (!applicant) throw new HttpError(404, 'Application not found for this payment reference');
  if (expectedApplicantId && applicant._id.toString() !== expectedApplicantId) throw new HttpError(404, 'Payment reference not found for your account');
  const expected = applicant.paymentExpectedAmount || Number(process.env.MEMBERSHIP_FEE_KOBO || '200000');
  if (transaction.status !== 'success' || transaction.currency !== 'NGN' || transaction.amount !== expected
    || transaction.customer?.email?.toLowerCase() !== applicant.email.toLowerCase()
    || (transaction.reference !== applicant.paymentRef && transaction.reference !== applicant.applicationRef.replace(/\//g, '-'))) {
    throw new HttpError(400, 'Payment amount, currency, payer or reference did not match this application');
  }
  const updated = await Applicant.findOneAndUpdate({ _id: applicant._id, paymentStatus: { $ne: 'paid' } }, { $set: {
    ...submissionFieldsOnPayment(applicant),
    paymentStatus: 'paid', paymentMethod: 'paystack', paymentRef: transaction.reference, paymentAmount: transaction.amount,
    paidAt: transaction.paid_at && Number.isFinite(Date.parse(transaction.paid_at)) ? new Date(transaction.paid_at) : new Date(),
  }, $unset: { paymentClaimStatus: '', paymentClaimedAt: '', paymentClaimConfirmedAt: '', paymentClaimConfirmedBy: ''   } }, { new: true });
  return { applicant: updated || applicant, changed: !!updated };
}
