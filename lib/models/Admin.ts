import mongoose, { Schema, models, Model } from 'mongoose';

export interface IAdmin {
  fullName: string;
  email: string;
  password: string;
  passwordChangedAt?: Date;
  role: 'Super Admin' | 'Admin' | 'Verifier';
  isActive: boolean;
  isDeleted?: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

const AdminSchema = new Schema<IAdmin>({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true },
  passwordChangedAt: { type: Date },
  role: { type: String, enum: ['Super Admin', 'Admin', 'Verifier'], default: 'Admin' },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false, index: true },
  lastLogin: { type: Date }
}, {
  timestamps: true
});

const Admin: Model<IAdmin> = models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);

export default Admin;
