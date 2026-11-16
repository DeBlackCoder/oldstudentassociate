import type { CommunityRecord, ScholarshipStatus } from './types';

export function applicationWindow(record: Pick<Extract<CommunityRecord, { kind: 'scholarships' }>, 'status' | 'details'>, now = new Date()): 'Open' | 'Upcoming' | 'Closed' {
  if (record.status !== 'Published' || now.getTime() > Date.parse(record.details.deadline)) return 'Closed';
  return now.getTime() < Date.parse(record.details.opensAt) ? 'Upcoming' : 'Open';
}
export function canWithdraw(status: ScholarshipStatus) { return status === 'Submitted' || status === 'Under Review'; }
export function canEditContent(role: string) { return role === 'Admin' || role === 'Super Admin'; }
export function publicContent(record: Record<string, unknown>) {
  // An explicit projection keeps admin identities and future private fields out of responses.
  const { _id, kind, title, summary, body, status, details, createdAt, updatedAt } = record;
  return { _id, kind, title, summary, body, status, details, createdAt, updatedAt };
}
