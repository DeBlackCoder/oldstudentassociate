import mongoose, { Schema, models, Model } from 'mongoose';
import type { CommunityInput } from '@/lib/community/validation';

type ICommunityContent = CommunityInput & {
  createdBy: mongoose.Types.ObjectId; updatedBy: mongoose.Types.ObjectId; createdAt: Date; updatedAt: Date;
};
const CommunityContentSchema = new Schema<ICommunityContent>({
  kind: { type: String, enum: ['programmes', 'welfare', 'scholarships', 'minutes'], required: true },
  title: { type: String, required: true }, summary: { type: String, required: true }, body: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Published', 'Archived'], default: 'Draft', required: true },
  // Each kind's complete details are validated with communitySchema before persistence.
  details: { type: Schema.Types.Mixed, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });
CommunityContentSchema.index({ kind: 1, status: 1, createdAt: -1 });
const CommunityContent: Model<ICommunityContent> = models.CommunityContent || mongoose.model<ICommunityContent>('CommunityContent', CommunityContentSchema);
export default CommunityContent;
