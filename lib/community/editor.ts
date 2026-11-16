import type { ContentKind } from './types';
export interface EditorField { key: string; label: string; type?: 'text' | 'email' | 'number' | 'datetime-local' | 'date' | 'url' | 'textarea' | 'lines'; required?: boolean; hint?: string }
export const DETAIL_FIELDS: Record<ContentKind, EditorField[]> = {
  programmes: [
    { key: 'category', label: 'Category', required: true }, { key: 'organiser', label: 'Organiser', required: true },
    { key: 'startDate', label: 'Start date and time', type: 'datetime-local', required: true }, { key: 'endDate', label: 'End date and time', type: 'datetime-local' },
    { key: 'location', label: 'Venue / online format', required: true }, { key: 'contactEmail', label: 'Contact email', type: 'email', required: true },
    { key: 'eligibility', label: 'Who can participate', type: 'textarea', required: true },
    { key: 'fee', label: 'Participation fee (NGN; 0 for free)', type: 'number', required: true }, { key: 'capacity', label: 'Capacity (optional)', type: 'number' },
    { key: 'registrationUrl', label: 'Registration link (optional)', type: 'url' },
    { key: 'objectives', label: 'Objectives', type: 'lines', required: true, hint: 'One objective per line.' },
  ],
  welfare: [
    { key: 'category', label: 'Support category', required: true }, { key: 'contactEmail', label: 'Contact email', type: 'email', required: true },
    { key: 'startDate', label: 'Start date', type: 'date', required: true }, { key: 'endDate', label: 'End date', type: 'date' },
    { key: 'targetAmount', label: 'Fundraising target (NGN, optional)', type: 'number' },
  ],
  scholarships: [
    { key: 'sponsor', label: 'Sponsor', required: true }, { key: 'academicLevel', label: 'Eligible academic level(s)', required: true },
    { key: 'awardAmount', label: 'Award per recipient (NGN)', type: 'number', required: true }, { key: 'awardSlots', label: 'Number of awards', type: 'number', required: true },
    { key: 'opensAt', label: 'Applications open', type: 'datetime-local', required: true }, { key: 'deadline', label: 'Application deadline', type: 'datetime-local', required: true },
    { key: 'eligibility', label: 'Eligibility criteria', type: 'lines', required: true, hint: 'One criterion per line.' },
    { key: 'requiredDocuments', label: 'Required supporting documents', type: 'lines', required: true, hint: 'One document name per line, up to 20. Applicants provide a link for each document.' },
    { key: 'selectionProcess', label: 'Selection process and award terms', type: 'textarea', required: true }, { key: 'contactEmail', label: 'Enquiries email', type: 'email', required: true },
  ],
  minutes: [
    { key: 'meetingDate', label: 'Meeting date and time', type: 'datetime-local', required: true }, { key: 'location', label: 'Venue / meeting format', required: true },
    { key: 'chairperson', label: 'Chairperson', required: true }, { key: 'secretary', label: 'Recording secretary', required: true },
    { key: 'attendees', label: 'Attendees', type: 'lines', required: true, hint: 'One name per line.' }, { key: 'apologies', label: 'Apologies', type: 'lines' },
    { key: 'agenda', label: 'Agenda / discussion pointers', type: 'lines', required: true, hint: 'One agenda item per line.' },
    { key: 'decisions', label: 'Decisions and resolutions', type: 'lines', hint: 'One decision per line.' }, { key: 'nextMeetingDate', label: 'Next meeting (optional)', type: 'datetime-local' },
  ],
};
export interface EditorDraft { kind: ContentKind; title: string; summary: string; body: string; status: 'Draft' | 'Published' | 'Archived'; details: Record<string, unknown> }
export function emptyDraft(kind: ContentKind): EditorDraft {
  const details: Record<string, unknown> = {};
  for (const field of DETAIL_FIELDS[kind]) details[field.key] = field.type === 'lines' ? [] : '';
  if (kind === 'programmes') { details.fee = 0; details.schedule = []; }
  if (kind === 'welfare') { details.donors = []; details.beneficiaries = []; }
  if (kind === 'minutes') details.actionItems = [];
  return { kind, title: '', summary: '', body: '', status: 'Draft', details };
}
export function localDateTime(value: string) {
  const date = new Date(value);
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}
export function prepareDraft(draft: EditorDraft) {
  const details = { ...draft.details };
  for (const field of DETAIL_FIELDS[draft.kind]) {
    const value = details[field.key];
    if (field.type === 'lines') details[field.key] = [...new Set((value as string[]).map(line => line.trim()).filter(Boolean))];
    if (field.type === 'number') details[field.key] = value === '' || value === undefined ? undefined : Number(value);
    if (field.type === 'datetime-local' && value) details[field.key] = new Date(String(value)).toISOString();
  }
  if (draft.kind === 'welfare') for (const key of ['donors', 'beneficiaries']) {
    details[key] = (details[key] as Record<string, unknown>[]).map(person => ({ ...person, amount: person.amount === '' || person.amount === undefined ? undefined : Number(person.amount) }));
  }
  return { ...draft, details };
}
