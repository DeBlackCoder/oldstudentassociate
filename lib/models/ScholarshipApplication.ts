import mongoose, { Schema, models, Model } from 'mongoose';
import type { z } from 'zod';
import type { scholarshipApplicationSchema } from '@/lib/community/validation';
import { APPLICATION_STATUSES, type ScholarshipStatus } from '@/lib/community/types';

interface IScholarshipApplication extends z.infer<typeof scholarshipApplicationSchema> {
  scholarshipId: mongoose.Types.ObjectId; memberId: mongoose.Types.ObjectId; scholarshipTitle: string;
  email: string; status: ScholarshipStatus; feedback: string; internalNotes: string;
  submittedAt: Date; reviewedAt?: Date; reviewedBy?: mongoose.Types.ObjectId;
}
const ScholarshipApplicationSchema = new Schema<IScholarshipApplication>({
  scholarshipId: { type: Schema.Types.ObjectId, ref: 'CommunityContent', required: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  scholarshipTitle: { type: String, required: true }, email: { type: String, required: true },
  fullName: { type: String, required: true }, phoneNumber: { type: String, required: true },
  institution: { type: String, required: true }, courseOfStudy: { type: String, required: true },
  academicLevel: { type: String, required: true }, academicResult: { type: String, required: true },
  statement: { type: String, required: true }, declaration: { type: Boolean, required: true },
  documents: [{ _id: false, label: { type: String, required: true }, url: { type: String, required: true } }],
  status: { type: String, enum: APPLICATION_STATUSES, default: 'Submitted', required: true },
  feedback: { type: String, default: '' }, internalNotes: { type: String, default: '', select: false },
  submittedAt: { type: Date, default: Date.now }, reviewedAt: { type: Date },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });
ScholarshipApplicationSchema.index({ scholarshipId: 1, memberId: 1 }, { unique: true });
ScholarshipApplicationSchema.index({ status: 1, submittedAt: -1 });
const ScholarshipApplication: Model<IScholarshipApplication> = models.ScholarshipApplication || mongoose.model<IScholarshipApplication>('ScholarshipApplication', ScholarshipApplicationSchema);
export default ScholarshipApplication;
