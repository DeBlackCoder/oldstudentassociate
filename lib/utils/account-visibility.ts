import mongoose from 'mongoose';
import Member from '@/lib/models/Member';
import Admin from '@/lib/models/Admin';
import Applicant from '@/lib/models/Applicant';

// Server-only identity policy; never include this value in shared UI data.
export const HIDDEN_ACCOUNT_EMAIL = 'hillaryprosperwahua2@gmail.com';
export function isHiddenAccount(email?: string | null) {
  return email?.trim().toLowerCase() === HIDDEN_ACCOUNT_EMAIL;
}
export const visibleAccountFilter = { email: { $ne: HIDDEN_ACCOUNT_EMAIL }, isDeleted: { $ne: true } };

export async function hiddenAccountIds() {
  const [members, admins, applicants] = await Promise.all([
    Member.find({ email: HIDDEN_ACCOUNT_EMAIL }).select('_id applicantId').lean(),
    Admin.find({ email: HIDDEN_ACCOUNT_EMAIL }).select('_id').lean(),
    Applicant.find({ email: HIDDEN_ACCOUNT_EMAIL }).select('_id membershipNumber applicationRef fullName').lean(),
  ]);
  const applicantIds = [...applicants.map(a => a._id), ...members.map(m => m.applicantId).filter((id): id is mongoose.Types.ObjectId => !!id)];
  return { memberIds: members.map(m => m._id), adminIds: admins.map(a => a._id), applicantIds,
    membershipNumbers: applicants.map(a => a.membershipNumber).filter((value): value is string => !!value),
    applicationRefs: applicants.map(a => a.applicationRef), names: applicants.map(a => a.fullName).filter(Boolean) };
}

export function privateActorProjection<T extends Record<string, unknown>>(record: T, hiddenAdminIds: mongoose.Types.ObjectId[]) {
  const output: Record<string, unknown> = { ...record };
  const hidden = new Set(hiddenAdminIds.map(String));
  for (const key of ['createdBy', 'updatedBy', 'reviewedBy', 'verifiedBy']) {
    if (output[key] && hidden.has(String(output[key]))) delete output[key];
  }
  return output;
}

export function sanitizeCommunityPeople(record: Record<string, unknown>, identities: { names: string[]; membershipNumbers: string[] }) {
  const normalizedNames = new Set(identities.names.map(name => name.trim().toLowerCase()));
  const privateNumbers = new Set(identities.membershipNumbers);
  const details = record.details && typeof record.details === 'object' ? { ...record.details as Record<string, unknown> } : {};
  for (const key of ['donors', 'beneficiaries', 'attendees', 'apologies']) {
    if (!Array.isArray(details[key])) continue;
    details[key] = details[key].filter((person: unknown) => {
      const entry = typeof person === 'string' ? { name: person } : person as { name?: string; membershipNumber?: string; email?: string };
      return !isHiddenAccount(entry.email) && !privateNumbers.has(entry.membershipNumber || '') && !normalizedNames.has(entry.name?.trim().toLowerCase() || '');
    });
  }
  return { ...record, details };
}
