import mongoose, { Schema, models, Model } from 'mongoose';

export interface INotification {
  type: 'new_registration' | 'payment_received' | 'new_event' | 'general' | 'activity';
  audience?: 'admins' | 'owner';
  readBy?: mongoose.Types.ObjectId[];
  action?: string;
  actorId?: string;
  targetId?: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  type: { type: String, enum: ['new_registration', 'payment_received', 'new_event', 'general', 'activity'], required: true },
  audience: { type: String, enum: ['admins', 'owner'], default: 'admins', index: true },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'Admin' }],
  action: String, actorId: String, targetId: String,
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

const Notification: Model<INotification> =
  models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
