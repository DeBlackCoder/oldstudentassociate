import { Schema, models, model, type Model } from 'mongoose';

export interface IPaymentSettings { key: string; quarterlyDuesKobo: number }
const schema = new Schema<IPaymentSettings>({
  key: { type: String, required: true, unique: true, default: 'association' },
  quarterlyDuesKobo: { type: Number, required: true, min: 1, max: 1_000_000_000, validate: Number.isInteger },
}, { timestamps: true });
const PaymentSettings: Model<IPaymentSettings> = models.PaymentSettings || model<IPaymentSettings>('PaymentSettings', schema);
export default PaymentSettings;
