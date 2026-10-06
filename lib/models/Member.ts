import mongoose, { Schema, models, Model } from 'mongoose';

export interface IMember {
  email: string;
  password: string;
  emailVerified: boolean;
  emailVerificationCode?: string;
  emailVerificationExpiry?: Date;
  profileComplete: boolean;
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
  emailVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String },
  emailVerificationExpiry: { type: Date },
  profileComplete: { type: Boolean, default: false },
  applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant' },
  applicationRef: { type: String },
  fullName: { type: String },
  formDraft: { type: Schema.Types.Mixed },
}, { timestamps: true });

const Member: Model<IMember> = models.Member || mongoose.model<IMember>('Member', MemberSchema);
export default Member;
