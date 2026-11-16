import mongoose from 'mongoose';
import type { Model } from 'mongoose';
import Member from '@/lib/models/Member';
import { visibleAccountFilter } from '@/lib/utils/account-visibility';
import { HttpError } from '@/lib/community/server';
import type { IDuesPayment } from '@/lib/models/DuesPayment';
import type { IWelfarePayment } from '@/lib/models/WelfarePayment';
import type { IDuesCheckout } from '@/lib/models/DuesCheckout';
import type { z } from 'zod';
import type { paymentCorrectionSchema } from './policy';

export async function assertVisiblePaymentMember(memberId: string | mongoose.Types.ObjectId) {
  const member = await Member.findOne({ _id: memberId, emailVerified: true, ...visibleAccountFilter });
  if (!member) throw new HttpError(404, 'Member not found');
  return member;
}
export async function correctPayment<T extends IDuesPayment | IWelfarePayment>(
  model: Model<T>, checkouts: Model<IDuesCheckout>, id: string, adminId: mongoose.Types.ObjectId,
  input: z.infer<typeof paymentCorrectionSchema>,
) {
  const invoice = await model.findById(id);
  if (!invoice) throw new HttpError(404, 'Payment record not found');
  await assertVisiblePaymentMember(invoice.memberId);
  if (input.status === 'Paid' && invoice.status !== 'Paid' && !input.bankReference) throw new HttpError(400, 'Enter the bank reference for a manually confirmed payment');
  if (input.status === 'Unpaid' && invoice.status === 'Unpaid' && input.amountKobo === undefined) throw new HttpError(400, 'This payment is already unpaid');
  // Invalidate captured receipts before a correction; a delayed webhook cannot restore an old payment.
  await checkouts.updateMany({ invoiceId: invoice._id }, { $set: { status: 'Voided' } });
  const before = { status: invoice.status, amountKobo: invoice.amountKobo, paymentRef: invoice.paymentRef || '', bankReference: invoice.bankReference || '' };
  const payment = await model.findOneAndUpdate({ _id: id, status: invoice.status, amountKobo: invoice.amountKobo, updatedAt: invoice.get('updatedAt') }, {
    $set: { status: input.status, ...(input.amountKobo === undefined ? {} : { amountKobo: input.amountKobo }),
      reviewedBy: adminId, reviewedAt: new Date(), adminNote: input.note,
      ...(input.bankReference ? { bankReference: input.bankReference } : {}),
      ...(input.status === 'Paid' ? { paidAt: invoice.paidAt || new Date(), ...(invoice.status !== 'Paid' ? { paymentMethod: 'bank' } : {}) } : {}),
    },
    ...(input.status !== 'Paid' ? { $unset: { paidAt: 1, paymentRef: 1 } } : {}),
  }, { new: true, runValidators: true });
  if (!payment) throw new HttpError(409, 'This payment changed while you were editing it. Refresh and try again.');
  return { payment, before };
}
