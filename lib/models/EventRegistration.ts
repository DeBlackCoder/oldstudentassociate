import mongoose, { Schema, models, Model } from 'mongoose';

export interface IEventRegistration {
  eventId: mongoose.Types.ObjectId;
  applicantId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  membershipNumber: string;
  paymentStatus: 'unpaid' | 'paid' | 'free';
  paymentRef?: string;
  paidAt?: Date;
  registeredAt: Date;
  eventCardRef?: string;
}

const EventRegistrationSchema = new Schema<IEventRegistration>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant', required: true, index: true },
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  membershipNumber: { type: String, required: true },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'free'],
    default: 'unpaid',
    index: true,
  },
  paymentRef: { type: String, sparse: true },
  paidAt: { type: Date },
  registeredAt: { type: Date, default: Date.now, index: true },
  eventCardRef: { type: String, unique: true, sparse: true },
});

// Compound unique index: one registration per applicant per event
EventRegistrationSchema.index({ eventId: 1, applicantId: 1 }, { unique: true });

const EventRegistration: Model<IEventRegistration> =
  models.EventRegistration ||
  mongoose.model<IEventRegistration>('EventRegistration', EventRegistrationSchema);

export default EventRegistration;
