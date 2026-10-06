import mongoose, { Schema, models, Model } from 'mongoose';

export interface IBankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode?: string;
  updatedBy?: string;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>({
  bankName: { type: String, required: true },
  accountName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  sortCode: { type: String },
  updatedBy: { type: String },
}, {
  timestamps: true,
});

const BankAccount: Model<IBankAccount> =
  models.BankAccount || mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);

export default BankAccount;
