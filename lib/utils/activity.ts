import mongoose from 'mongoose';
import Notification from '@/lib/models/Notification';
import { isHiddenAccount } from './account-visibility';

export interface PortalActivity {
  action: string; details: string; actorEmail?: string; actorId?: string; targetId?: string; link?: string;
}
/** Private, persistent in-portal activity alerts; never sends an email. */
export async function recordActivity(activity: PortalActivity) {
  // Unit tests use isolated model mocks; a disconnected connection must not buffer writes.
  if (mongoose.connection.readyState !== 1) return;
  try {
    const actor = isHiddenAccount(activity.actorEmail) ? 'Account owner' : activity.actorEmail || 'System';
    await Notification.create({ type: 'activity', audience: 'owner', title: activity.action.replaceAll('_', ' '),
      message: `${actor}: ${activity.details}`, link: activity.link || '/admin/dashboard/activity',
      action: activity.action, actorId: activity.actorId, targetId: activity.targetId });
  } catch (error) { console.error('Private activity alert could not be recorded:', error); }
}
