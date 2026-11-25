import mongoose, { Schema, models, Model } from 'mongoose';

export interface IMember {
  email: string;
  password: string;
  googleId?: string;
  passwordChangedAt?: Date;
  emailVerified: boolean;
  isDeleted?: boolean;
  registrationFeeApproved?: boolean;
  registrationPreApproved?: boolean;
  emailVerificationCode?: string;
  emailVerificationExpiry?: Date;
  profileComplete: boolean;
  adminId?: mongoose.Types.ObjectId;
  // Linked applicant data (filled after profile form)
  applicantId?: mongoose.Types.ObjectId;
  applicationRef?: string;
  fullName?: string;
  createdAt: Date;
  formDraft?: Record<string, unknown>;
}

const MemberSchema = new Schema<IMember>({
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true, select: false },
  googleId: { type: String, unique: true, sparse: true, index: true },
  passwordChangedAt: { type: Date },
  emailVerified: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false, index: true },
  registrationFeeApproved: { type: Boolean, default: false },
  registrationPreApproved: { type: Boolean, default: false },
  emailVerificationCode: { type: String },
  emailVerificationExpiry: { type: Date },
  profileComplete: { type: Boolean, default: false },
  adminId: { type: Schema.Types.ObjectId, ref: 'Admin', unique: true, sparse: true },
  applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant' },
  applicationRef: { type: String },
  fullName: { type: String },
  formDraft: { type: Schema.Types.Mixed },
}, { timestamps: true });

const Member: Model<IMember> = models.Member || mongoose.model<IMember>('Member', MemberSchema);
export default Member;
