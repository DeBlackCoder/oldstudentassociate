import mongoose, { Schema, models, type Model } from 'mongoose';

export interface IDuesPayment {
  memberId: mongoose.Types.ObjectId;
  year: number;
  quarter: number;
  amountKobo: number;
  status: 'Unpaid' | 'Pending' | 'Paid' | 'Rejected';
  paymentMethod?: 'paystack' | 'bank';
  paymentRef?: string;
  bankReference?: string;
  senderName?: string;
  transferDate?: Date;
  submittedAt?: Date;
  paidAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  adminNote?: string;
}
const schema = new Schema<IDuesPayment>({
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  year: { type: Number, required: true, min: 2020, max: 2100 },
  quarter: { type: Number, required: true, min: 1, max: 4 },
  amountKobo: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['Unpaid', 'Pending', 'Paid', 'Rejected'], default: 'Unpaid', index: true },
  paymentMethod: { type: String, enum: ['paystack', 'bank'] },
  paymentRef: String, bankReference: String, senderName: String, transferDate: Date,
  submittedAt: Date, paidAt: Date, reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  reviewedAt: Date, adminNote: String,
}, { timestamps: true });
schema.index({ memberId: 1, year: 1, quarter: 1 }, { unique: true });
schema.index({ bankReference: 1 }, { unique: true, partialFilterExpression: { bankReference: { $type: 'string' } } });
const DuesPayment: Model<IDuesPayment> = models.DuesPayment || mongoose.model<IDuesPayment>('DuesPayment', schema);
export default DuesPayment;
