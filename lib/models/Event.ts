import mongoose, { Schema, models, Model } from 'mongoose';

export interface IEvent {
  title: string;
  description: string;
  date: Date;
  location: string;
  registrationFee: number; // stored in kobo
  isFree: boolean;
  maxAttendees?: number;
  status: 'Draft' | 'Published' | 'Cancelled' | 'Completed';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    location: { type: String, required: true },
    registrationFee: { type: Number, required: true, default: 0 },
    isFree: { type: Boolean, required: true, default: true },
    maxAttendees: { type: Number },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Cancelled', 'Completed'],
      default: 'Draft',
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true }
);

const Event: Model<IEvent> = models.Event || mongoose.model<IEvent>('Event', EventSchema);
export default Event;
