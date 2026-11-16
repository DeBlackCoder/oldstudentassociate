import mongoose, { Schema, models, Model } from 'mongoose';

export interface IAuditLog {
  adminId: mongoose.Types.ObjectId;
  adminName: string;
  action: string;
  targetType: 'Applicant' | 'Member' | 'Admin' | 'School' | 'System';
  targetId?: string;
  details: string;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
  adminName: { type: String, required: true },
  action: { type: String, required: true, index: true },
  targetType: { type: String, enum: ['Applicant', 'Member', 'Admin', 'School', 'System'], required: true },
  targetId: { type: String, index: true },
  details: { type: String, required: true },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
});

AuditLogSchema.post('save', async function (record) {
  const { recordActivity } = await import('@/lib/utils/activity');
  await recordActivity({ action: record.action, actorEmail: record.adminName, actorId: String(record.adminId), targetId: record.targetId, details: record.details });
});

const AuditLog: Model<IAuditLog> = models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
