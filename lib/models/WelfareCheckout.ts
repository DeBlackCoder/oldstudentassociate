import { Schema, models, model, type Model } from 'mongoose';
import type { IDuesCheckout } from './DuesCheckout';

const schema = new Schema<IDuesCheckout>({
  invoiceId: { type: Schema.Types.ObjectId, ref: 'WelfarePayment', required: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  reference: { type: String, required: true, unique: true }, email: { type: String, required: true },
  amountKobo: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid', 'Duplicate', 'Voided'], default: 'Pending' },
  paidAt: Date,
}, { timestamps: true });
const WelfareCheckout: Model<IDuesCheckout> = models.WelfareCheckout || model<IDuesCheckout>('WelfareCheckout', schema);
export default WelfareCheckout;
