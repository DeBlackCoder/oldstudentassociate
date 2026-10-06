import mongoose, { Schema, models, Model } from 'mongoose';

export interface IAdmin {
  fullName: string;
  email: string;
  password: string;
  role: 'Super Admin' | 'Admin' | 'Verifier';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

const AdminSchema = new Schema<IAdmin>({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Super Admin', 'Admin', 'Verifier'], default: 'Admin' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, {
  timestamps: true
});

const Admin: Model<IAdmin> = models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);

export default Admin;
