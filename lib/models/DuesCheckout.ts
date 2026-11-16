import mongoose, { Schema, models, type Model } from 'mongoose';

export interface IDuesCheckout {
  invoiceId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  reference: string;
  email: string;
  amountKobo: number;
  status: 'Pending' | 'Paid' | 'Duplicate' | 'Voided';
  paidAt?: Date;
}
const schema = new Schema<IDuesCheckout>({
  invoiceId: { type: Schema.Types.ObjectId, ref: 'DuesPayment', required: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  reference: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  amountKobo: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid', 'Duplicate', 'Voided'], default: 'Pending' },
  paidAt: Date,
}, { timestamps: true });
const DuesCheckout: Model<IDuesCheckout> = models.DuesCheckout || mongoose.model<IDuesCheckout>('DuesCheckout', schema);
export default DuesCheckout;
