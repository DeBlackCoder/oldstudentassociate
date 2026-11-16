import { Schema, models, model, type Model } from 'mongoose';
import type { IDuesPayment } from './DuesPayment';

export type IWelfarePayment = Omit<IDuesPayment, 'year' | 'quarter'> & { fundId: IDuesPayment['memberId'] };
const schema = new Schema<IWelfarePayment>({
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  fundId: { type: Schema.Types.ObjectId, ref: 'WelfareFund', required: true, index: true },
  amountKobo: { type: Number, required: true, min: 1, max: 1_000_000_000, validate: Number.isInteger },
  status: { type: String, enum: ['Unpaid', 'Pending', 'Paid', 'Rejected'], default: 'Unpaid', index: true },
  paymentMethod: { type: String, enum: ['paystack', 'bank'] },
  paymentRef: String, bankReference: String, senderName: String, transferDate: Date,
  submittedAt: Date, paidAt: Date, reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  reviewedAt: Date, adminNote: String,
}, { timestamps: true });
schema.index({ memberId: 1, fundId: 1 }, { unique: true });
schema.index({ bankReference: 1 }, { unique: true, partialFilterExpression: { bankReference: { $type: 'string' } } });
const WelfarePayment: Model<IWelfarePayment> = models.WelfarePayment || model<IWelfarePayment>('WelfarePayment', schema);
export default WelfarePayment;
