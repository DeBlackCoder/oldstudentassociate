import test from 'node:test';
import assert from 'node:assert/strict';
import { communitySchema, reviewSchema, scholarshipApplicationSchema } from '../lib/community/validation';
import { applicationWindow, canEditContent, canWithdraw, publicContent } from '../lib/community/policy';
import { emptyDraft, prepareDraft } from '../lib/community/editor';

const base = { title: 'Association update', summary: 'An association update for our community.', body: 'The full description of our community initiative.', status: 'Published' as const };
const scholarship = {
  ...base, kind: 'scholarships' as const, details: {
    sponsor: 'Alumni fund', academicLevel: 'Undergraduate', awardAmount: 150000, awardSlots: 5,
    opensAt: '2026-10-01T00:00:00Z', deadline: '2026-10-31T23:59:00Z',
    eligibility: ['Rivers State secondary school alumni'], requiredDocuments: ['Academic transcript'],
    selectionProcess: 'Applications are assessed for eligibility and academic merit.', contactEmail: 'scholarships@example.org',
  },
};
const programme = {
  ...base, kind: 'programmes' as const, details: {
    category: 'Mentorship', startDate: '2026-11-01T10:00:00Z', endDate: '2026-11-01T12:00:00Z',
    location: 'Port Harcourt', organiser: 'Alumni team', contactEmail: 'programmes@example.org',
    eligibility: 'All alumni and students', fee: 0, objectives: ['Help students plan their careers'],
    schedule: [{ time: '11:00 WAT', activity: 'Welcome and introductions' }], registrationUrl: 'https://example.org/register',
  },
};
const welfare = {
  ...base, kind: 'welfare' as const, details: {
    category: 'Education support', startDate: '2026-10-01', contactEmail: 'welfare@example.org',
    donors: [{ name: 'Sample donor', amount: 20000, date: '2026-10-02', purpose: 'School supplies' }],
    beneficiaries: [{ name: 'Sample beneficiary', amount: 15000, date: '2026-10-03', purpose: 'Textbooks' }],
  },
};
const minutes = {
  ...base, kind: 'minutes' as const, details: {
    meetingDate: '2020-10-01T10:00:00Z', location: 'Association hall', chairperson: 'Chair', secretary: 'Secretary',
    attendees: ['Chair', 'Secretary'], apologies: [], agenda: ['Review education support'], decisions: ['Launch support initiative'],
    actionItems: [{ action: 'Prepare the support plan', owner: 'Secretary', dueDate: '2020-10-15', status: 'Open' as const }],
  },
};
const application = {
  fullName: 'Sample student', phoneNumber: '08012345678', institution: 'Sample university',
  courseOfStudy: 'Engineering', academicLevel: 'Year 2', academicResult: 'CGPA 4.5 / 5.0',
  statement: 'I am seeking educational support to complete my studies and contribute my engineering skills to my community after graduation.',
  documents: [{ label: 'Academic transcript', url: 'https://example.org/transcript.pdf' }], declaration: true as const,
};

test('all four kinds accept complete structured records', () => {
  for (const record of [programme, welfare, scholarship, minutes]) assert.equal(communitySchema.safeParse(record).success, true, record.kind);
});
test('welfare preserves donor and beneficiary names and optional undisclosed amounts', () => {
  const result = communitySchema.parse({ ...welfare, details: { ...welfare.details, donors: [{ name: 'Donor', purpose: 'Supplies' }] } });
  assert.equal(result.kind, 'welfare');
  if (result.kind === 'welfare') { assert.equal(result.details.donors[0].name, 'Donor'); assert.equal(result.details.donors[0].amount, undefined); assert.equal(result.details.beneficiaries[0].name, 'Sample beneficiary'); }
});
test('reject negative donations and unnamed beneficiaries', () => {
  assert.equal(communitySchema.safeParse({ ...welfare, details: { ...welfare.details, donors: [{ name: 'Donor', amount: -1 }] } }).success, false);
  assert.equal(communitySchema.safeParse({ ...welfare, details: { ...welfare.details, beneficiaries: [{ name: '', purpose: 'Support' }] } }).success, false);
});
test('reject reversed programme dates and invalid calendar dates', () => {
  assert.equal(communitySchema.safeParse({ ...programme, details: { ...programme.details, endDate: '2026-10-01T00:00:00Z' } }).success, false);
  assert.equal(communitySchema.safeParse({ ...welfare, details: { ...welfare.details, startDate: '2026-02-31' } }).success, false);
});
test('programme registration links cannot execute scripts', () => {
  assert.equal(communitySchema.safeParse({ ...programme, details: { ...programme.details, registrationUrl: 'javascript:alert(1)' } }).success, false);
});
test('scholarships require valid award size, slots and deadline order', () => {
  for (const detail of [{ awardAmount: 0 }, { awardSlots: 0 }, { awardSlots: 1.5 }, { deadline: scholarship.details.opensAt }]) {
    assert.equal(communitySchema.safeParse({ ...scholarship, details: { ...scholarship.details, ...detail } }).success, false);
  }
});
test('scholarships require eligibility and document instructions', () => {
  for (const detail of [{ eligibility: [] }, { requiredDocuments: [] }]) assert.equal(communitySchema.safeParse({ ...scholarship, details: { ...scholarship.details, ...detail } }).success, false);
  assert.equal(communitySchema.safeParse({ ...scholarship, details: { ...scholarship.details, requiredDocuments: Array.from({ length: 21 }, (_, i) => `Document ${i}`) } }).success, false);
});
test('application windows honour publication, opening time and closing time', () => {
  assert.equal(applicationWindow(scholarship, new Date('2026-09-30T23:59:00Z')), 'Upcoming');
  assert.equal(applicationWindow(scholarship, new Date(scholarship.details.opensAt)), 'Open');
  assert.equal(applicationWindow(scholarship, new Date(scholarship.details.deadline)), 'Open');
  assert.equal(applicationWindow(scholarship, new Date('2026-11-01T00:00:00Z')), 'Closed');
  assert.equal(applicationWindow({ ...scholarship, status: 'Draft' }, new Date('2026-10-15')), 'Closed');
  assert.equal(applicationWindow({ ...scholarship, status: 'Archived' }, new Date('2026-10-15')), 'Closed');
});
test('applications require an accurate-information declaration and meaningful statement', () => {
  assert.equal(scholarshipApplicationSchema.safeParse(application).success, true);
  assert.equal(scholarshipApplicationSchema.safeParse({ ...application, declaration: false }).success, false);
  assert.equal(scholarshipApplicationSchema.safeParse({ ...application, statement: 'Short' }).success, false);
});
test('applications reject executable links, missing documents and injected account fields', () => {
  assert.equal(scholarshipApplicationSchema.safeParse({ ...application, documents: [{ label: 'Transcript', url: 'javascript:alert(1)' }] }).success, false);
  assert.equal(scholarshipApplicationSchema.safeParse({ ...application, documents: [] }).success, false);
  assert.equal(scholarshipApplicationSchema.safeParse({ ...application, memberId: 'another-member' }).success, false);
  assert.equal(scholarshipApplicationSchema.safeParse({ ...application, status: 'Approved' }).success, false);
});
test('only submitted and under-review applications can be withdrawn', () => {
  assert.equal(canWithdraw('Submitted'), true); assert.equal(canWithdraw('Under Review'), true);
  for (const status of ['Approved', 'Rejected', 'Withdrawn'] as const) assert.equal(canWithdraw(status), false);
});
test('rejections require applicant feedback and review payload cannot change ownership', () => {
  assert.equal(reviewSchema.safeParse({ status: 'Rejected', feedback: '' }).success, false);
  assert.equal(reviewSchema.safeParse({ status: 'Rejected', feedback: 'This opportunity is for secondary school students.' }).success, true);
  assert.equal(reviewSchema.safeParse({ status: 'Approved', memberId: 'someone-else' }).success, false);
  assert.equal(reviewSchema.safeParse({ status: 'Withdrawn' }).success, false);
});
test('published minutes must be from a past meeting and identify action owners', () => {
  assert.equal(communitySchema.safeParse({ ...minutes, details: { ...minutes.details, meetingDate: '2099-01-01T00:00:00Z' } }).success, false);
  assert.equal(communitySchema.safeParse({ ...minutes, details: { ...minutes.details, actionItems: [{ action: 'Follow up', owner: '', status: 'Open' }] } }).success, false);
  assert.equal(communitySchema.safeParse({ ...minutes, details: { ...minutes.details, nextMeetingDate: '2019-01-01' } }).success, false);
});
test('public records omit admin identities and unexpected private fields', () => {
  const output = publicContent({ ...welfare, _id: 'id', createdBy: 'admin', updatedBy: 'admin', internalNotes: 'Private', createdAt: '2026-10-01', updatedAt: '2026-10-02' });
  assert.equal('createdBy' in output, false); assert.equal('updatedBy' in output, false); assert.equal('internalNotes' in output, false);
  assert.equal(output.title, welfare.title);
});
test('content writes are restricted to active-admin editor roles', () => {
  assert.equal(canEditContent('Admin'), true); assert.equal(canEditContent('Super Admin'), true);
  for (const role of ['Verifier', 'member', '', 'Unknown']) assert.equal(canEditContent(role), false);
});
test('editor cleans list entries and converts financial inputs without discarding text', () => {
  const draft = emptyDraft('welfare');
  draft.details.donors = [{ name: 'Donor', amount: '', date: '', purpose: 'Supplies' }];
  const prepared = prepareDraft(draft);
  assert.equal((prepared.details.donors as { amount?: number }[])[0].amount, undefined);
  const programmeDraft = emptyDraft('programmes'); programmeDraft.details.objectives = [' One ', '', 'One', 'Two']; programmeDraft.details.fee = '2000';
  const preparedProgramme = prepareDraft(programmeDraft);
  assert.deepEqual(preparedProgramme.details.objectives, ['One', 'Two']); assert.equal(preparedProgramme.details.fee, 2000);
});
