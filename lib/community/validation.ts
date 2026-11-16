import { z } from 'zod';

const shortText = z.string().trim().min(1).max(200);
const date = z.string().refine(value => {
  if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const calendarDate = value.slice(0, 10);
  return new Date(`${calendarDate}T00:00:00Z`).toISOString().slice(0, 10) === calendarDate;
}, 'Enter a valid date');
const optionalDate = z.union([date, z.literal('')]).optional().transform(value => value || undefined);
const money = z.number().finite().min(0).max(1_000_000_000);
const positiveInteger = z.number().int().min(1).max(1_000_000);
const email = z.string().trim().email().max(254);
const textList = z.array(z.string().trim().min(1).max(1000)).max(100);
const webUrl = z.string().trim().url().max(2000).refine(value => /^https?:\/\//i.test(value), 'Use an http or https link');
const person = z.object({
  name: shortText, amount: money.optional(), date: optionalDate,
  purpose: z.string().trim().max(1000).default(''),
  membershipNumber: z.string().trim().max(80).optional().transform(value => value || undefined),
}).strict();
const base = {
  title: z.string().trim().min(3).max(200), summary: z.string().trim().min(10).max(1000),
  body: z.string().trim().min(10).max(100_000), status: z.enum(['Draft', 'Published', 'Archived']),
};
const programme = z.object({
  ...base, kind: z.literal('programmes'), details: z.object({
    category: shortText, startDate: date, endDate: optionalDate, location: shortText,
    organiser: shortText, contactEmail: email, eligibility: z.string().trim().min(3).max(3000),
    fee: money, capacity: positiveInteger.optional(),
    registrationUrl: z.union([webUrl, z.literal('')]).optional().transform(value => value || undefined),
    objectives: textList.min(1), schedule: z.array(z.object({ time: shortText, activity: shortText }).strict()).max(100),
  }).strict().refine(d => !d.endDate || Date.parse(d.endDate) >= Date.parse(d.startDate), { message: 'End date must be on or after the start date', path: ['endDate'] }),
}).strict();
const welfare = z.object({
  ...base, kind: z.literal('welfare'), details: z.object({
    category: shortText, startDate: date, endDate: optionalDate, targetAmount: money.optional(),
    contactEmail: email, donors: z.array(person).max(300), beneficiaries: z.array(person).max(300),
  }).strict().refine(d => !d.endDate || Date.parse(d.endDate) >= Date.parse(d.startDate), { message: 'End date must be on or after the start date', path: ['endDate'] }),
}).strict();
const scholarship = z.object({
  ...base, kind: z.literal('scholarships'), details: z.object({
    sponsor: shortText, academicLevel: shortText, awardAmount: money.refine(v => v > 0, 'Award must be greater than zero'),
    awardSlots: positiveInteger, opensAt: date, deadline: date,
    eligibility: textList.min(1), requiredDocuments: textList.min(1).max(20),
    selectionProcess: z.string().trim().min(10).max(5000), contactEmail: email,
  }).strict().refine(d => Date.parse(d.deadline) > Date.parse(d.opensAt), { message: 'Deadline must be after the opening date', path: ['deadline'] }),
}).strict();
const minutes = z.object({
  ...base, kind: z.literal('minutes'), details: z.object({
    meetingDate: date, location: shortText, chairperson: shortText, secretary: shortText,
    attendees: textList.min(1), apologies: textList, agenda: textList.min(1), decisions: textList,
    actionItems: z.array(z.object({
      action: z.string().trim().min(3).max(1000), owner: shortText, dueDate: optionalDate,
      status: z.enum(['Open', 'In Progress', 'Completed']),
    }).strict()).max(100), nextMeetingDate: optionalDate,
  }).strict().refine(d => !d.nextMeetingDate || Date.parse(d.nextMeetingDate) > Date.parse(d.meetingDate), { message: 'Next meeting must be after this meeting', path: ['nextMeetingDate'] }),
}).strict().refine(d => d.status !== 'Published' || Date.parse(d.details.meetingDate) <= Date.now(), { message: 'Published minutes must describe a meeting that has already taken place', path: ['details', 'meetingDate'] });
export const communitySchema = z.discriminatedUnion('kind', [programme, welfare, scholarship, minutes]);
export type CommunityInput = z.infer<typeof communitySchema>;
export const scholarshipApplicationSchema = z.object({
  fullName: z.string().trim().min(3).max(200), phoneNumber: z.string().trim().min(7).max(30),
  institution: shortText, courseOfStudy: shortText, academicLevel: shortText,
  academicResult: z.string().trim().min(2).max(1000), statement: z.string().trim().min(100).max(10_000),
  documents: z.array(z.object({ label: shortText, url: webUrl }).strict()).min(1).max(20),
  declaration: z.literal(true, { error: 'Confirm your application is accurate' }),
}).strict();
export const reviewSchema = z.object({
  status: z.enum(['Under Review', 'Approved', 'Rejected']),
  feedback: z.string().trim().max(5000).default(''), internalNotes: z.string().trim().max(5000).default(''),
}).strict().refine(d => d.status !== 'Rejected' || d.feedback.length > 0, { message: 'Give the applicant a reason for rejection', path: ['feedback'] });
