import mongoose, { Model, Schema, models } from 'mongoose';

export interface IPasswordReset {
  accountKey: string;
  adminId?: mongoose.Types.ObjectId;
  memberId?: mongoose.Types.ObjectId;
  tokenHash: string;
  requestedAt: Date;
  expiresAt: Date;
  consumedAt?: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>({
  accountKey: { type: String, required: true, unique: true },
  adminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member' },
  tokenHash: { type: String, required: true, select: false, index: true },
  requestedAt: { type: Date, required: true },
  // Expiry is checked in the consume query; TTL cleanup is not used for authorization.
  expiresAt: { type: Date, required: true, expires: 0 },
  consumedAt: { type: Date },
});

const PasswordReset: Model<IPasswordReset> = models.PasswordReset || mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);
export default PasswordReset;
