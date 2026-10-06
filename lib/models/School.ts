import mongoose, { Schema, models, Model } from 'mongoose';

export interface ISchool {
  name: string;
  lga: string;
  address?: string;
  isActive: boolean;
  memberCount: number;
  createdAt: Date;
}

const SchoolSchema = new Schema<ISchool>({
  name: { type: String, required: true, unique: true, index: true },
  lga: { type: String, required: true, index: true },
  address: { type: String },
  isActive: { type: Boolean, default: true },
  memberCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

const School: Model<ISchool> = models.School || mongoose.model<ISchool>('School', SchoolSchema);

export default School;
