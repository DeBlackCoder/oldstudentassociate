import { Schema, models, model, type Model } from 'mongoose';

export interface IWelfareFund { title: string; description: string; amountKobo: number; isActive: boolean; createdAt: Date }
const schema = new Schema<IWelfareFund>({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 5000 },
  amountKobo: { type: Number, required: true, min: 1, max: 1_000_000_000, validate: Number.isInteger },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });
const WelfareFund: Model<IWelfareFund> = models.WelfareFund || model<IWelfareFund>('WelfareFund', schema);
export default WelfareFund;
