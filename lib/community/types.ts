export const CONTENT_KINDS = ['programmes', 'welfare', 'scholarships', 'minutes'] as const;
export type ContentKind = typeof CONTENT_KINDS[number];
export const CONTENT_LABELS: Record<ContentKind, string> = {
  programmes: 'Programmes', welfare: 'Welfare', scholarships: 'Scholarships', minutes: 'Meeting minutes',
};
export const CONTENT_INTROS: Record<ContentKind, string> = {
  programmes: 'Explore the initiatives, training and community programmes organised by our association.',
  welfare: 'Recognising the people who give and the people we support. Our published welfare record is open to everyone.',
  scholarships: 'Discover education funding, check eligibility and submit an application for opportunities that fit you.',
  minutes: 'Read the record of past meetings, decisions made and the actions agreed by the association.',
};
export interface PersonEntry { name: string; amount?: number; date?: string; purpose: string; membershipNumber?: string }
export interface ScheduleEntry { time: string; activity: string }
export interface ActionEntry { action: string; owner: string; dueDate?: string; status: 'Open' | 'In Progress' | 'Completed' }
export interface ProgrammeDetails {
  category: string; startDate: string; endDate?: string; location: string; organiser: string;
  contactEmail: string; eligibility: string; fee: number; capacity?: number;
  registrationUrl?: string; objectives: string[]; schedule: ScheduleEntry[];
}
export interface WelfareDetails {
  category: string; startDate: string; endDate?: string; targetAmount?: number;
  contactEmail: string; donors: PersonEntry[]; beneficiaries: PersonEntry[];
}
export interface ScholarshipDetails {
  sponsor: string; academicLevel: string; awardAmount: number; awardSlots: number;
  opensAt: string; deadline: string; eligibility: string[]; requiredDocuments: string[];
  selectionProcess: string; contactEmail: string;
}
export interface MinutesDetails {
  meetingDate: string; location: string; chairperson: string; secretary: string;
  attendees: string[]; apologies: string[]; agenda: string[]; decisions: string[];
  actionItems: ActionEntry[]; nextMeetingDate?: string;
}
interface ContentBase { _id: string; title: string; summary: string; body: string; status: 'Draft' | 'Published' | 'Archived'; createdAt: string; updatedAt: string }
export type CommunityRecord = ContentBase & (
  { kind: 'programmes'; details: ProgrammeDetails } |
  { kind: 'welfare'; details: WelfareDetails } |
  { kind: 'scholarships'; details: ScholarshipDetails } |
  { kind: 'minutes'; details: MinutesDetails }
);
export const APPLICATION_STATUSES = ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Withdrawn'] as const;
export type ScholarshipStatus = typeof APPLICATION_STATUSES[number];
export interface ScholarshipApplicationView {
  _id: string; scholarshipId: string; scholarshipTitle: string; fullName: string; email: string;
  phoneNumber: string; institution: string; courseOfStudy: string; academicLevel: string;
  academicResult: string; statement: string; documents: { label: string; url: string }[];
  status: ScholarshipStatus; feedback: string; submittedAt: string; reviewedAt?: string;
  internalNotes?: string;
}
