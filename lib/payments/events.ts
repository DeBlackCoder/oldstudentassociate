import EventRegistration from '@/lib/models/EventRegistration';
import Event from '@/lib/models/Event';
import { HttpError } from '@/lib/community/server';
import type { PaystackTransaction } from './policy';
export async function confirmEventTransaction(transaction: PaystackTransaction, memberId?: string, eventId?: string) {
  const registration = await EventRegistration.findOne({ $or: [{ paymentRef: transaction.reference }, { eventCardRef: transaction.reference }, { eventCardRef: transaction.reference.replace(/-/g, '/') }] });
  if (!registration || (memberId && registration.memberId.toString() !== memberId) || (eventId && registration.eventId.toString() !== eventId)) throw new HttpError(404, 'Event registration not found for your account');
  const event = await Event.findById(registration.eventId);
  if (!event) throw new HttpError(404, 'Event not found');
  const expected = registration.paymentAmount ?? event.registrationFee;
  if (transaction.status !== 'success' || transaction.currency !== 'NGN' || transaction.amount !== expected || transaction.customer?.email?.toLowerCase() !== registration.email.toLowerCase()) throw new HttpError(400, 'Payment amount, currency or payer did not match this event registration');
  await EventRegistration.updateOne({ _id: registration._id, paymentStatus: 'unpaid' }, { $set: { paymentStatus: 'paid', paymentRef: transaction.reference, paidAt: new Date(transaction.paid_at || Date.now()) } });
  return registration;
}
