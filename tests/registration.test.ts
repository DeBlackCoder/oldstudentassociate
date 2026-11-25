import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import Member from '../lib/models/Member';
import Applicant from '../lib/models/Applicant';
import Admin from '../lib/models/Admin';
import Counter from '../lib/models/Counter';
import AuditLog from '../lib/models/AuditLog';
import Notification from '../lib/models/Notification';
import { applicationStatusForMember, submittedApplicationFilter, submissionFieldsOnPayment } from '../lib/registration/policy';
import { createMemberToken } from '../lib/utils/member-auth';
import { createToken } from '../lib/utils/auth';
import { visibleAccountFilter } from '../lib/utils/account-visibility';

const email = 'member@example.org';
const now = new Date('2026-10-07T12:00:00Z');
const completeForm = {
  fullName: 'Avery Member', dateOfBirth: '1990-03-02', gender: 'Female',
  phoneNumber: '08012345678', whatsappNumber: '08012345678', email,
  residentialAddress: '12 School Road, Port Harcourt', stateOfOrigin: 'Rivers', lga: 'Port Harcourt', referredBy: 'A fellow alumnus',
  secondarySchool: 'Community Secondary School', graduationYear: '2006',
  positionHeldInSchool: 'Library Prefect', currentOccupation: 'Teacher', employmentType: 'Public Service',
  organizationName: 'Community School', skills: ['Teaching'], willingToParticipate: true,
  contributionAreas: ['Mentorship'], agreedToDeclaration: true, signature: 'Avery Member', signatureDate: '2026-10-07',
};

function isolatedConnection() {
  // All operations are mocked. Never connect to the configured project database.
  process.env.MONGODB_URI ||= 'mongodb://127.0.0.1/unused_registration_test_database';
  global.mongoose ||= { conn: null, promise: null };
  global.mongoose.conn = mongoose;
  global.mongoose.promise = null;
}
function selectedResult<T>(value: T) {
  return Object.assign(Promise.resolve(value), { select: () => Promise.resolve(value) });
}
function mockCookies(t: TestContext, values: Record<string, string> = {}) {
  const headersModule = createRequire(resolve('package.json'))('next/headers') as typeof import('next/headers');
  t.mock.method(headersModule, 'cookies', () => Promise.resolve({ get: (name: string) => values[name] ? { name, value: values[name] } : undefined }) as unknown as ReturnType<typeof headersModule.cookies>);
}
async function mockMember(t: TestContext, verified = true) {
  isolatedConnection();
  const member = new Member({ email, password: 'unused-password', emailVerified: verified });
  mockCookies(t, { 'member-token': await createMemberToken(member._id.toString(), member.email) });
  t.mock.method(Member, 'findById', () => selectedResult(member) as unknown as ReturnType<typeof Member.findById>);
  return member;
}
async function mockAdmin(t: TestContext, role: 'Super Admin' | 'Verifier' = 'Super Admin') {
  isolatedConnection();
  const admin = new Admin({ email: 'reviewer@example.org', password: 'unused-password', fullName: 'Reviewer', role, isActive: true });
  mockCookies(t, { 'admin-token': await createToken({ adminId: admin._id.toString(), email: admin.email, role: admin.role }) });
  t.mock.method(Admin, 'findById', () => selectedResult(admin) as unknown as ReturnType<typeof Admin.findById>);
  return admin;
}
function registrationRequest(data: unknown = completeForm) {
  return new NextRequest('http://localhost/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
function suppressDelivery(t: TestContext) {
  const emails: unknown[] = [];
  t.mock.method(nodemailer, 'createTransport', () => ({ sendMail: async (message: unknown) => { emails.push(message); return { messageId: 'isolated-registration-email' }; } }) as unknown as ReturnType<typeof nodemailer.createTransport>);
  const notifications = t.mock.method(Notification, 'create', () => Promise.resolve({}) as unknown as ReturnType<typeof Notification.create>);
  return { emails, notifications };
}
function temporaryEnv(t: TestContext, name: string, value: string) {
  const previous = process.env[name]; process.env[name] = value;
  t.after(() => { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; });
}
function applyUpdate(applicant: InstanceType<typeof Applicant>, update: unknown) {
  const values = update as { $set?: Record<string, unknown>; $setOnInsert?: Record<string, unknown> };
  Object.assign(applicant, values.$set || {});
}
function mockStoredForm(t: TestContext, member: InstanceType<typeof Member>, existing?: InstanceType<typeof Applicant>) {
  let stored = existing || null;
  let sequence = 0;
  t.mock.method(Applicant, 'init', () => Promise.resolve(Applicant) as unknown as ReturnType<typeof Applicant.init>);
  t.mock.method(Counter, 'findOneAndUpdate', () => Promise.resolve({ seq: ++sequence }) as unknown as ReturnType<typeof Counter.findOneAndUpdate>);
  t.mock.method(Applicant, 'findById', () => selectedResult(stored) as unknown as ReturnType<typeof Applicant.findById>);
  t.mock.method(Applicant, 'findOne', () => selectedResult(stored) as unknown as ReturnType<typeof Applicant.findOne>);
  const writes: { filter: unknown; update: unknown }[] = [];
  t.mock.method(Applicant, 'findOneAndUpdate', (filter: unknown, update: unknown) => {
    writes.push({ filter, update });
    if (!stored) {
      const values = update as { $set?: Record<string, unknown>; $setOnInsert?: Record<string, unknown> };
      stored = new Applicant({ ...values.$setOnInsert, ...values.$set, memberId: member._id });
    } else applyUpdate(stored, update);
    return selectedResult(stored) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
  });
  t.mock.method(Member, 'findByIdAndUpdate', (_id: unknown, update: unknown) => {
    const values = update as { $set?: Record<string, unknown> };
    Object.assign(member, values.$set || update);
    return selectedResult(member) as unknown as ReturnType<typeof Member.findByIdAndUpdate>;
  });
  t.mock.method(Member, 'updateOne', (_filter: unknown, update: unknown) => {
    const values = update as { $set?: Record<string, unknown> };
    Object.assign(member, values.$set || update);
    return Promise.resolve({ acknowledged: true, matchedCount: 1, modifiedCount: 1 }) as unknown as ReturnType<typeof Member.updateOne>;
  });
  t.mock.method(member, 'save', () => Promise.resolve(member));
  return { writes, get applicant() { return stored; } };
}

test('unpaid legacy Pending applications are presented as Saved while reviewed states are preserved', () => {
  assert.equal(applicationStatusForMember({ status: 'Pending', paymentStatus: 'unpaid' }), 'Saved');
  assert.equal(applicationStatusForMember({ status: 'Pending', paymentStatus: 'failed' }), 'Saved');
  assert.equal(applicationStatusForMember({ status: 'Saved', paymentStatus: 'unpaid' }), 'Saved');
  assert.equal(applicationStatusForMember({ status: 'Pending', paymentStatus: 'paid' }), 'Pending');
  assert.equal(applicationStatusForMember({ status: 'Approved', paymentStatus: 'paid' }), 'Approved');
  assert.equal(applicationStatusForMember({ status: 'Rejected', paymentStatus: 'paid' }), 'Rejected');
});

test('formal review policy requires both a submitted state and confirmed payment', () => {
  assert.deepEqual(submittedApplicationFilter, { ...visibleAccountFilter, paymentStatus: 'paid', status: { $in: ['Pending', 'Approved', 'Rejected'] } });
});

test('first payment submits saved and legacy pending forms at the actual confirmation time', () => {
  for (const status of ['Saved', 'Pending'] as const) {
    const fields = submissionFieldsOnPayment({ status }, now);
    assert.equal(fields.status, 'Pending');
    assert.deepEqual(fields.submittedAt, now);
  }
});

test('payment cannot reset an approval, rejection or their submission dates', () => {
  for (const status of ['Approved', 'Rejected'] as const) {
    const fields = submissionFieldsOnPayment({ status }, now);
    assert.equal('status' in fields, false);
    assert.equal('submittedAt' in fields, false);
  }
});

test('complete registration saves require authentication and never allocate a reference for anonymous requests', async t => {
  isolatedConnection(); mockCookies(t);
  const counter = t.mock.method(Counter, 'findOneAndUpdate', () => { throw new Error('Anonymous requests cannot allocate a reference'); });
  const create = t.mock.method(Applicant, 'create', () => { throw new Error('Anonymous requests cannot create a form'); });
  const { POST } = await import('../app/api/register/route');
  assert.equal((await POST(registrationRequest())).status, 401);
  assert.equal(counter.mock.callCount(), 0); assert.equal(create.mock.callCount(), 0);
});

test('an unverified account cannot save a complete application', async t => {
  await mockMember(t, false);
  const update = t.mock.method(Applicant, 'findOneAndUpdate', () => { throw new Error('Unverified requests cannot save'); });
  const { POST } = await import('../app/api/register/route');
  const response = await POST(registrationRequest());
  assert.ok([401, 403].includes(response.status));
  assert.equal(update.mock.callCount(), 0);
});

test('an authenticated form cannot select another account by supplying its email', async t => {
  await mockMember(t);
  const update = t.mock.method(Applicant, 'findOneAndUpdate', () => { throw new Error('Another account must not be updated'); });
  const { POST } = await import('../app/api/register/route');
  const response = await POST(registrationRequest({ ...completeForm, email: 'somebody-else@example.org' }));
  assert.ok([400, 403].includes(response.status));
  assert.equal(update.mock.callCount(), 0);
});

test('a stale link to another account cannot overwrite that account\'s saved form', async t => {
  const member = await mockMember(t);
  const otherApplicant = new Applicant({ ...completeForm, email: 'other@example.org', memberId: new mongoose.Types.ObjectId(), applicationRef: 'RSSS/2026/900', status: 'Saved', paymentStatus: 'unpaid' });
  member.applicantId = otherApplicant._id; member.profileComplete = true;
  t.mock.method(Applicant, 'findOneAndUpdate', (filter: unknown) => {
    const query = filter as { _id: mongoose.Types.ObjectId; email: string; $or: { memberId: unknown }[] };
    assert.equal(query._id.toString(), otherApplicant._id.toString());
    assert.equal(query.email, member.email);
    assert.equal(query.$or[0].memberId, member._id);
    // An actual DB finds no record matching both the stale ID and this owner.
    return Promise.resolve(null) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
  });
  const { POST } = await import('../app/api/register/route');
  assert.equal((await POST(registrationRequest())).status, 409);
  assert.equal(otherApplicant.email, 'other@example.org'); assert.equal(otherApplicant.fullName, completeForm.fullName);
});

test('partial draft saving is self-only and cannot set application or payment state', async t => {
  const member = await mockMember(t);
  let saved: { formDraft?: Record<string, unknown> } = {};
  t.mock.method(Member, 'updateOne', (filter: unknown, update: unknown) => {
    assert.deepEqual(filter, { _id: member._id, profileComplete: false });
    saved = (update as { $set: typeof saved }).$set;
    return Promise.resolve({ acknowledged: true, matchedCount: 1, modifiedCount: 1 }) as unknown as ReturnType<typeof Member.updateOne>;
  });
  const application = t.mock.method(Applicant, 'findOneAndUpdate', () => { throw new Error('Saving a draft must not create or submit an application'); });
  const delivery = suppressDelivery(t);
  const { POST } = await import('../app/api/member/draft/route');
  const request = new NextRequest('http://localhost/api/member/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formData: { fullName: 'Draft Person', email: 'other@example.org', paymentStatus: 'paid', status: 'Approved', applicantId: new mongoose.Types.ObjectId().toString() }, step: 2 }) });
  assert.equal((await POST(request)).status, 200);
  assert.equal(saved.formDraft?.email, member.email); assert.equal(saved.formDraft?.fullName, 'Draft Person');
  for (const key of ['paymentStatus', 'status', 'applicantId']) assert.equal(key in (saved.formDraft || {}), false);
  assert.equal(application.mock.callCount(), 0); assert.equal(delivery.notifications.mock.callCount(), 0); assert.equal(delivery.emails.length, 0);
});

test('saving a complete form twice retains one Saved application and sends no submission alerts', async t => {
  const member = await mockMember(t);
  const storage = mockStoredForm(t, member);
  const delivery = suppressDelivery(t);
  const { POST } = await import('../app/api/register/route');
  const first = await POST(registrationRequest());
  assert.equal(first.status, 200);
  const firstBody = await first.json();
  assert.ok(firstBody.applicationRef);
  assert.equal(storage.applicant?.status, 'Saved'); assert.equal(storage.applicant?.paymentStatus, 'unpaid');
  assert.equal(storage.applicant?.submittedAt, undefined);
  assert.equal(member.profileComplete, true);
  assert.equal(member.applicantId?.toString(), storage.applicant?._id.toString());
  const second = await POST(registrationRequest({ ...completeForm, currentOccupation: 'Senior Teacher' }));
  assert.equal(second.status, 200);
  const secondBody = await second.json();
  assert.equal(secondBody.applicationRef, firstBody.applicationRef);
  assert.equal(storage.applicant?.currentOccupation, 'Senior Teacher');
  assert.equal(storage.applicant?.status, 'Saved'); assert.equal(storage.applicant?.submittedAt, undefined);
  assert.equal(delivery.emails.length, 0); assert.equal(delivery.notifications.mock.callCount(), 0);
});

test('a member can report in-person payment without submitting an unpaid application', async t => {
  const member = await mockMember(t);
  const applicant = new Applicant({ ...completeForm, memberId: member._id, applicationRef: 'RSSS/2026/040', status: 'Saved', paymentStatus: 'unpaid' });
  member.applicantId = applicant._id;
  t.mock.method(Applicant, 'findById', () => selectedResult(applicant) as unknown as ReturnType<typeof Applicant.findById>);
  t.mock.method(Applicant, 'findOneAndUpdate', (filter: unknown, update: unknown) => {
    assert.deepEqual(filter, {
      _id: applicant._id,
      memberId: member._id,
      email: member.email,
      paymentStatus: { $ne: 'paid' },
      paymentClaimStatus: { $ne: 'pending' },
    });
    const values = update as { $set: Record<string, unknown> };
    Object.assign(applicant, values.$set);
    return Promise.resolve(applicant) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
  });
  const { POST } = await import('../app/api/member/registration-payment/claim/route');

  const response = await POST();
  assert.equal(response.status, 200);
  assert.equal(applicant.paymentClaimStatus, 'pending');
  assert.ok(applicant.paymentClaimedAt instanceof Date);
  assert.equal(applicant.paymentStatus, 'unpaid');
  assert.equal(applicant.status, 'Saved');
  assert.equal(applicant.submittedAt, undefined);
});

test('concurrent first saves recover the unique-account conflict and reuse the winning form reference', async t => {
  const member = await mockMember(t);
  const applicant = new Applicant({ ...completeForm, memberId: member._id, applicationRef: 'RSSS/2026/777', status: 'Saved', paymentStatus: 'unpaid' });
  mockStoredForm(t, member, applicant); const delivery = suppressDelivery(t);
  // This request sees no form, but another request inserts one before its upsert.
  t.mock.method(Applicant, 'findOne', () => Promise.resolve(null) as unknown as ReturnType<typeof Applicant.findOne>);
  let attempts = 0;
  t.mock.method(Applicant, 'findOneAndUpdate', (_filter: unknown, update: unknown) => {
    if (++attempts === 1) return Promise.reject(Object.assign(new Error('Concurrent account reference'), { code: 11000 })) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
    applyUpdate(applicant, update);
    return Promise.resolve(applicant) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
  });
  const { POST } = await import('../app/api/register/route');
  const response = await POST(registrationRequest()); assert.equal(response.status, 200);
  assert.equal((await response.json()).applicationRef, 'RSSS/2026/777');
  assert.equal(member.applicationRef, 'RSSS/2026/777'); assert.equal(member.applicantId?.toString(), applicant._id.toString());
  assert.equal(applicant.status, 'Saved'); assert.equal(applicant.submittedAt, undefined);
  assert.equal(delivery.emails.length, 0); assert.equal(delivery.notifications.mock.callCount(), 0);
});

test('editing a paid approved form preserves payment, review, membership number and application reference', async t => {
  const member = await mockMember(t);
  const applicant = new Applicant({ ...completeForm, memberId: member._id, applicationRef: 'RSSS/2026/123', status: 'Approved', paymentStatus: 'paid', paymentRef: 'ORIGINAL-PAYMENT', paymentAmount: 200000, paymentMethod: 'paystack', paidAt: now, submittedAt: now, membershipNumber: 'RSSSOSAA/2026/00001', adminRemarks: 'Original approval' });
  member.profileComplete = true; member.applicantId = applicant._id; member.applicationRef = applicant.applicationRef;
  mockStoredForm(t, member, applicant); const delivery = suppressDelivery(t);
  const { POST } = await import('../app/api/register/route');
  const response = await POST(registrationRequest({ ...completeForm, fullName: 'Avery Updated', status: 'Saved', paymentStatus: 'unpaid', membershipNumber: 'ATTACKER-NUMBER' }));
  assert.equal(response.status, 200);
  assert.equal(applicant.fullName, 'Avery Updated'); assert.equal(applicant.applicationRef, 'RSSS/2026/123');
  assert.equal(applicant.status, 'Approved'); assert.equal(applicant.paymentStatus, 'paid');
  assert.equal(applicant.membershipNumber, 'RSSSOSAA/2026/00001'); assert.equal(applicant.paymentRef, 'ORIGINAL-PAYMENT');
  assert.equal(applicant.adminRemarks, 'Original approval'); assert.deepEqual(applicant.submittedAt, now); assert.deepEqual(applicant.paidAt, now);
  assert.equal(delivery.emails.length, 0); assert.equal(delivery.notifications.mock.callCount(), 0);
});

test('completed form retrieval returns saved fields for editing instead of a cleared partial draft', async t => {
  const member = await mockMember(t);
  const applicant = new Applicant({ ...completeForm, memberId: member._id, applicationRef: 'RSSS/2026/001', status: 'Saved', paymentStatus: 'unpaid', dateOfBirth: new Date(completeForm.dateOfBirth), signatureDate: new Date(completeForm.signatureDate) });
  member.profileComplete = true; member.applicantId = applicant._id; member.applicationRef = applicant.applicationRef;
  member.formDraft = undefined;
  t.mock.method(Applicant, 'findById', () => selectedResult(applicant) as unknown as ReturnType<typeof Applicant.findById>);
  t.mock.method(Applicant, 'findOne', () => selectedResult(applicant) as unknown as ReturnType<typeof Applicant.findOne>);
  const { GET } = await import('../app/api/member/draft/route');
  const response = await GET(); assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.profileComplete, true); assert.equal(body.applicationRef, 'RSSS/2026/001');
  assert.equal(body.draft.fullName, completeForm.fullName); assert.equal(body.draft.email, email);
  assert.equal(body.draft.dateOfBirth, '1990-03-02'); assert.equal(String(body.draft.graduationYear), '2006');
  assert.deepEqual(body.draft.skills, ['Teaching']); assert.equal('paymentStatus' in body.draft, false);
});

test('the review list includes only paid submitted applications even when a status filter is supplied', async t => {
  await mockAdmin(t);
  const filters: Record<string, unknown>[] = [];
  t.mock.method(Applicant, 'countDocuments', (filter: unknown) => { filters.push(filter as Record<string, unknown>); return Promise.resolve(0) as unknown as ReturnType<typeof Applicant.countDocuments>; });
  t.mock.method(Applicant, 'find', (filter: unknown) => {
    filters.push(filter as Record<string, unknown>);
    const query = { sort: () => query, skip: () => query, limit: () => query, select: () => Promise.resolve([]) };
    return query as unknown as ReturnType<typeof Applicant.find>;
  });
  const { GET } = await import('../app/api/admin/applications/route');
  for (const status of ['all', 'Pending', 'Approved', 'Rejected', 'Saved']) {
    const response = await GET(new NextRequest(`http://localhost/api/admin/applications?status=${status}`));
    assert.ok([200, 400].includes(response.status));
  }
  for (const filter of filters) assert.equal(filter.paymentStatus, 'paid');
});

test('anonymous checkout and browser payment verification cannot reach Paystack', async t => {
  isolatedConnection(); mockCookies(t);
  const remote = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unauthenticated requests must not contact Paystack'); });
  const checkout = await import('../app/api/payment/initialize/route');
  const callback = await import('../app/api/payment/verify/route');
  const request = new NextRequest('http://localhost/api/payment/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationRef: 'RSSS/2026/001', email }) });
  assert.equal((await checkout.POST(request)).status, 401);
  assert.equal((await callback.GET(new NextRequest('http://localhost/api/payment/verify?reference=RSSS-2026-001'))).status, 401);
  assert.equal(remote.mock.callCount(), 0);
});

test('checkout cannot select another member\'s form or payer email', async t => {
  const member = await mockMember(t);
  const applicant = new Applicant({ ...completeForm, memberId: member._id, applicationRef: 'RSSS/2026/001', status: 'Saved', paymentStatus: 'unpaid' });
  member.profileComplete = true; member.applicantId = applicant._id;
  t.mock.method(Applicant, 'findOne', (filter: unknown) => {
    const query = filter as { _id: mongoose.Types.ObjectId; email: string; applicationRef: string };
    assert.equal(query._id.toString(), member.applicantId!.toString()); assert.equal(query.email, member.email);
    return Promise.resolve(query.applicationRef === applicant.applicationRef ? applicant : null) as unknown as ReturnType<typeof Applicant.findOne>;
  });
  const save = t.mock.method(applicant, 'save', () => { throw new Error('Invalid identity must not prepare a checkout'); });
  const remote = t.mock.method(globalThis, 'fetch', () => { throw new Error('Invalid identity must not contact Paystack'); });
  const { POST } = await import('../app/api/payment/initialize/route');
  for (const payload of [{ applicationRef: 'RSSS/2026/999', email }, { applicationRef: applicant.applicationRef, email: 'other@example.org' }]) {
    const request = new NextRequest('http://localhost/api/payment/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    assert.equal((await POST(request)).status, 404);
  }
  assert.equal(save.mock.callCount(), 0); assert.equal(remote.mock.callCount(), 0); assert.equal(applicant.status, 'Saved');
});

test('a legitimate Saved checkout captures the amount and remains unsubmitted until confirmation', async t => {
  const member = await mockMember(t);
  temporaryEnv(t, 'PAYSTACK_SECRET_KEY', 'isolated-checkout-key'); temporaryEnv(t, 'MEMBERSHIP_FEE_KOBO', '200000');
  temporaryEnv(t, 'NEXT_PUBLIC_APP_URL', 'https://portal.example.org');
  const applicant = new Applicant({ ...completeForm, memberId: member._id, applicationRef: 'RSSS/2026/001', status: 'Saved', paymentStatus: 'unpaid' });
  member.profileComplete = true; member.applicantId = applicant._id;
  t.mock.method(Applicant, 'findOne', () => Promise.resolve(applicant) as unknown as ReturnType<typeof Applicant.findOne>);
  const save = t.mock.method(applicant, 'save', () => Promise.resolve(applicant));
  const remote = t.mock.method(globalThis, 'fetch', async (url: unknown, options?: RequestInit) => {
    assert.equal(url, 'https://api.paystack.co/transaction/initialize');
    const payload = JSON.parse(String(options?.body));
    assert.equal(payload.amount, 200000); assert.equal(payload.currency, 'NGN'); assert.equal(payload.email, member.email);
    assert.equal(payload.reference, 'RSSS-2026-001'); assert.equal(payload.callback_url, 'https://portal.example.org/register/payment/callback');
    return new Response(JSON.stringify({ status: true, data: { authorization_url: 'https://checkout.paystack.com/isolated-fixture', reference: payload.reference } }), { status: 200 });
  });
  const delivery = suppressDelivery(t);
  const { POST } = await import('../app/api/payment/initialize/route');
  const request = () => new NextRequest('http://localhost/api/payment/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationRef: applicant.applicationRef, email: member.email }) });
  const response = await POST(request()); assert.equal(response.status, 200);
  assert.equal((await response.json()).authorizationUrl, 'https://checkout.paystack.com/isolated-fixture');
  assert.equal(save.mock.callCount(), 1); assert.equal(remote.mock.callCount(), 1); assert.equal(applicant.paymentExpectedAmount, 200000);
  assert.equal(applicant.status, 'Saved'); assert.equal(applicant.paymentStatus, 'unpaid'); assert.equal(applicant.submittedAt, undefined);
  assert.equal(delivery.emails.length, 0); assert.equal(delivery.notifications.mock.callCount(), 0);
  applicant.paymentStatus = 'paid';
  assert.ok([400, 409].includes((await POST(request())).status));
  assert.equal(remote.mock.callCount(), 1); assert.equal(save.mock.callCount(), 1);
});

test('a signed-in callback cannot confirm or disclose another account\'s payment', async t => {
  const member = await mockMember(t); member.applicantId = new mongoose.Types.ObjectId();
  temporaryEnv(t, 'PAYSTACK_SECRET_KEY', 'isolated-verification-key');
  const otherApplicant = new Applicant({ ...completeForm, email: 'other@example.org', applicationRef: 'RSSS/2026/999', status: 'Saved', paymentStatus: 'unpaid', paymentExpectedAmount: 200000 });
  t.mock.method(Applicant, 'findOne', () => Promise.resolve(otherApplicant) as unknown as ReturnType<typeof Applicant.findOne>);
  const update = t.mock.method(Applicant, 'findOneAndUpdate', () => { throw new Error('Cross-account callback must not change an application'); });
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ status: true, data: { reference: 'RSSS-2026-999', status: 'success', currency: 'NGN', amount: 200000, customer: { email: otherApplicant.email } } }), { status: 200 }));
  const { GET } = await import('../app/api/payment/verify/route');
  const response = await GET(new NextRequest('http://localhost/api/payment/verify?reference=RSSS-2026-999'));
  assert.equal(response.status, 404); const body = await response.json();
  assert.equal('applicant' in body, false); assert.equal(JSON.stringify(body).includes(otherApplicant.email), false);
  assert.equal(update.mock.callCount(), 0); assert.equal(otherApplicant.status, 'Saved'); assert.equal(otherApplicant.paymentStatus, 'unpaid');
});

test('successful Paystack confirmation atomically submits Saved and duplicate confirmations preserve its date', async t => {
  isolatedConnection();
  const { confirmMembershipTransaction } = await import('../lib/payments/membership');
  const applicant = new Applicant({ ...completeForm, graduationYear: 2006, applicationRef: 'RSSS/2026/001', status: 'Saved', paymentStatus: 'unpaid', paymentExpectedAmount: 200000 });
  t.mock.method(Applicant, 'findOne', () => Promise.resolve(applicant) as unknown as ReturnType<typeof Applicant.findOne>);
  const writes: unknown[] = [];
  t.mock.method(Applicant, 'findOneAndUpdate', (filter: unknown, update: unknown) => {
    assert.deepEqual(filter, { _id: applicant._id, paymentStatus: { $ne: 'paid' } });
    if (applicant.paymentStatus === 'paid') return Promise.resolve(null) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
    writes.push(update); applyUpdate(applicant, update);
    return Promise.resolve(applicant) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
  });
  const transaction = { reference: 'RSSS-2026-001', status: 'success', currency: 'NGN', amount: 200000, customer: { email }, paid_at: now.toISOString() };
  const first = await confirmMembershipTransaction(transaction);
  assert.equal(first.changed, true); assert.equal(applicant.status, 'Pending'); assert.equal(applicant.paymentStatus, 'paid');
  assert.ok(applicant.submittedAt instanceof Date);
  const submittedAt = applicant.submittedAt.toISOString();
  assert.equal((await confirmMembershipTransaction(transaction)).changed, false);
  assert.equal(writes.length, 1); assert.equal(applicant.submittedAt.toISOString(), submittedAt);
  assert.equal(applicant.applicationRef, 'RSSS/2026/001');
});

test('failed or mismatched payments leave Saved forms unsubmitted', async t => {
  isolatedConnection();
  const { confirmMembershipTransaction } = await import('../lib/payments/membership');
  const applicant = new Applicant({ email, applicationRef: 'RSSS/2026/001', status: 'Saved', paymentStatus: 'unpaid', paymentExpectedAmount: 200000 });
  t.mock.method(Applicant, 'findOne', () => Promise.resolve(applicant) as unknown as ReturnType<typeof Applicant.findOne>);
  const update = t.mock.method(Applicant, 'findOneAndUpdate', () => { throw new Error('Invalid payment must not submit a form'); });
  const transaction = { reference: 'RSSS-2026-001', status: 'success', currency: 'NGN', amount: 200000, customer: { email } };
  for (const invalid of [{ ...transaction, status: 'failed' }, { ...transaction, amount: 199999 }, { ...transaction, currency: 'USD' }, { ...transaction, customer: { email: 'other@example.org' } }]) {
    await assert.rejects(confirmMembershipTransaction(invalid), /did not match/);
  }
  assert.equal(update.mock.callCount(), 0); assert.equal(applicant.status, 'Saved'); assert.equal(applicant.paymentStatus, 'unpaid');
  assert.equal(applicant.submittedAt, undefined);
});

test('manual bank confirmation submits a saved form once and records one audit event', async t => {
  await mockAdmin(t);
  const applicant = new Applicant({ ...completeForm, applicationRef: 'RSSS/2026/001', status: 'Saved', paymentStatus: 'unpaid', paymentExpectedAmount: 300000 });
  t.mock.method(Applicant, 'findById', () => selectedResult(applicant) as unknown as ReturnType<typeof Applicant.findById>);
  const writes: unknown[] = [];
  t.mock.method(Applicant, 'findOneAndUpdate', (filter: unknown, update: unknown) => {
    assert.equal((filter as { paymentStatus: { $ne: string } }).paymentStatus.$ne, 'paid');
    if (applicant.paymentStatus === 'paid') return Promise.resolve(null) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
    writes.push(update); applyUpdate(applicant, update);
    return Promise.resolve(applicant) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
  });
  const save = t.mock.method(applicant, 'save', () => { throw new Error('Bank confirmation must use an atomic conditional update'); });
  const audit = t.mock.method(AuditLog, 'create', () => Promise.resolve({}) as unknown as ReturnType<typeof AuditLog.create>);
  suppressDelivery(t);
  const { POST } = await import('../app/api/admin/applications/[id]/mark-paid/route');
  const context = { params: Promise.resolve({ id: applicant._id.toString() }) };
  const request = () => new NextRequest(`http://localhost/api/admin/applications/${applicant._id}/mark-paid`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remarks: 'Verified against statement' }) });
  assert.equal((await POST(request(), context)).status, 200);
  assert.equal(applicant.paymentStatus, 'paid'); assert.equal(applicant.status, 'Pending'); assert.equal(applicant.paymentMethod, 'bank');
  assert.equal(applicant.paymentAmount, 300000);
  assert.ok(applicant.submittedAt instanceof Date); assert.ok(applicant.paidAt instanceof Date);
  const submittedAt = applicant.submittedAt.toISOString();
  assert.ok([400, 409].includes((await POST(request(), context)).status));
  assert.equal(writes.length, 1); assert.equal(save.mock.callCount(), 0); assert.equal(audit.mock.callCount(), 1);
  assert.equal(applicant.submittedAt.toISOString(), submittedAt);
});

test('admin confirmation of an in-person payment records the claim and submits the form', async t => {
  const admin = await mockAdmin(t);
  const applicant = new Applicant({
    ...completeForm,
    applicationRef: 'RSSS/2026/002',
    status: 'Saved',
    paymentStatus: 'unpaid',
    paymentExpectedAmount: 200000,
    paymentClaimStatus: 'pending',
    paymentClaimedAt: now,
  });
  t.mock.method(Applicant, 'findById', () => selectedResult(applicant) as unknown as ReturnType<typeof Applicant.findById>);
  let write: { filter: unknown; update: unknown } | undefined;
  t.mock.method(Applicant, 'findOneAndUpdate', (filter: unknown, update: unknown) => {
    write = { filter, update };
    applyUpdate(applicant, update);
    return Promise.resolve(applicant) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
  });
  let auditAction = '';
  t.mock.method(AuditLog, 'create', (record: { action: string }) => {
    auditAction = record.action;
    return Promise.resolve({}) as unknown as ReturnType<typeof AuditLog.create>;
  });
  suppressDelivery(t);
  const { POST } = await import('../app/api/admin/applications/[id]/mark-paid/route');
  const request = new NextRequest(`http://localhost/api/admin/applications/${applicant._id}/mark-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remarks: 'Confirmed with receiving administrator' }),
  });
  const response = await POST(request, { params: Promise.resolve({ id: applicant._id.toString() }) });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).success, true);
  assert.equal((write?.filter as { paymentClaimStatus: string }).paymentClaimStatus, 'pending');
  const update = write?.update as { $set: Record<string, unknown> };
  assert.equal(update.$set.paymentStatus, 'paid');
  assert.equal(update.$set.paymentMethod, 'admin');
  assert.equal(update.$set.paymentClaimStatus, 'confirmed');
  assert.equal(update.$set.paymentClaimConfirmedBy, admin._id);
  assert.equal(update.$set.status, 'Pending');
  assert.ok(update.$set.submittedAt instanceof Date);
  assert.equal(auditAction, 'Confirmed in-person registration payment');
});

test('a read-only verifier cannot manually confirm a registration payment', async t => {
  await mockAdmin(t, 'Verifier');
  const update = t.mock.method(Applicant, 'findOneAndUpdate', () => { throw new Error('Verifier must not confirm money received'); });
  const { POST } = await import('../app/api/admin/applications/[id]/mark-paid/route');
  const id = new mongoose.Types.ObjectId().toString();
  const request = new NextRequest(`http://localhost/api/admin/applications/${id}/mark-paid`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remarks: 'Forbidden' }) });
  assert.equal((await POST(request, { params: Promise.resolve({ id }) })).status, 403);
  assert.equal(update.mock.callCount(), 0);
});

test('legacy unpaid Pending applications cannot be rejected before payment', async t => {
  await mockAdmin(t);
  const applicant = new Applicant({ ...completeForm, applicationRef: 'RSSS/2026/001', status: 'Pending', paymentStatus: 'unpaid' });
  t.mock.method(Applicant, 'findById', () => selectedResult(applicant) as unknown as ReturnType<typeof Applicant.findById>);
  const save = t.mock.method(applicant, 'save', () => { throw new Error('Unpaid applications are withheld from formal review'); });
  const { POST } = await import('../app/api/admin/applications/[id]/reject/route');
  const request = new NextRequest(`http://localhost/api/admin/applications/${applicant._id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remarks: 'Review must wait for payment' }) });
  assert.ok([400, 409].includes((await POST(request, { params: Promise.resolve({ id: applicant._id.toString() }) })).status));
  assert.equal(save.mock.callCount(), 0); assert.equal(applicant.status, 'Pending');
});
