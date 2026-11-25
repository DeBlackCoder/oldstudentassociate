import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { NextRequest } from 'next/server';
import Admin from '../lib/models/Admin';
import Member from '../lib/models/Member';
import Applicant from '../lib/models/Applicant';
import AuditLog from '../lib/models/AuditLog';
import { ensureAdminMember } from '../lib/utils/admin-member';
import { adminMatchesMember } from '../lib/utils/admin-member-policy';
import { createMemberToken, getMemberSession, verifyMemberToken } from '../lib/utils/member-auth';
import { createToken, verifyToken } from '../lib/utils/auth';

const admin = { _id: new mongoose.Types.ObjectId(), email: 'admin@example.org', password: 'existing-password-hash', fullName: 'Test Administrator', isActive: true };
const loadModule = createRequire(resolve('package.json'));
const headersModule = loadModule('next/headers') as typeof import('next/headers');
function mockCookies(t: TestContext, initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const store = {
    get: (name: string) => values.has(name) ? { name, value: values.get(name)! } : undefined,
    set: (name: string, value: string) => { values.set(name, value); },
    delete: (name: string) => { values.delete(name); },
  };
  t.mock.method(headersModule, 'cookies', () => Promise.resolve(store) as unknown as ReturnType<typeof headersModule.cookies>);
  return values;
}
function isolatedConnection() {
  // Route handlers use this cached connection; all model operations are mocked.
  // No configured database is contacted or modified by these integration tests.
  process.env.MONGODB_URI ||= 'mongodb://127.0.0.1/unused_account_test_database';
  global.mongoose ||= { conn: null, promise: null };
  global.mongoose.conn = mongoose;
  global.mongoose.promise = null;
}
// Session getters select their fields, while account routes await the same query.
function selectedResult<T>(value: T) {
  return Object.assign(Promise.resolve(value), { select: () => Promise.resolve(value) });
}
test('a new admin receives a regular member account without membership approval or payment', async t => {
  const member = new Member({ email: admin.email, password: admin.password, emailVerified: true, adminId: admin._id });
  t.mock.method(Member, 'findOne', () => Promise.resolve(null) as unknown as ReturnType<typeof Member.findOne>);
  const calls: unknown[][] = [];
  t.mock.method(Member, 'findOneAndUpdate', (...args: unknown[]) => { calls.push(args); return Promise.resolve(member) as unknown as ReturnType<typeof Member.findOneAndUpdate>; });
  const result = await ensureAdminMember(admin);
  assert.equal(result._id.toString(), member._id.toString());
  const [filter, update, options] = calls[0] as [{ email: string; $or: unknown[] }, { $set: Record<string, unknown>; $setOnInsert: Record<string, unknown> }, { upsert: boolean; new: boolean }];
  assert.equal(filter.email, admin.email);
  assert.equal(update.$set.adminId, admin._id);
  assert.equal(update.$set.emailVerified, true);
  assert.equal(update.$setOnInsert.password, admin.password);
  assert.equal(update.$setOnInsert.profileComplete, false);
  assert.equal('applicantId' in update.$set, false);
  assert.equal('paymentStatus' in update.$set, false);
  assert.equal(options.upsert, true); assert.equal(options.new, true);
});
test('linking an existing member preserves profile, draft, password and application data', async t => {
  const member = new Member({ email: admin.email, password: 'members-original-hash', profileComplete: true, applicantId: new mongoose.Types.ObjectId(), applicationRef: 'RSSS/2026/001', formDraft: { skills: ['Teaching'] }, fullName: 'Existing member' });
  t.mock.method(Member, 'findOne', () => Promise.resolve(null) as unknown as ReturnType<typeof Member.findOne>);
  let written: Record<string, Record<string, unknown>> = {};
  t.mock.method(Member, 'findOneAndUpdate', (_filter: unknown, update: unknown) => { written = update as typeof written; return Promise.resolve(member) as unknown as ReturnType<typeof Member.findOneAndUpdate>; });
  const result = await ensureAdminMember(admin);
  for (const field of ['password', 'profileComplete', 'applicantId', 'applicationRef', 'formDraft', 'fullName', 'email']) assert.equal(field in written.$set, false, field);
  assert.equal(result.password, 'members-original-hash');
  assert.equal(result.profileComplete, true);
  assert.equal(result.applicationRef, 'RSSS/2026/001');
  assert.deepEqual(result.formDraft, { skills: ['Teaching'] });
});
test('a linked account is reused even when the admin email changes', async t => {
  const member = new Member({ email: 'previous-email@example.org', password: 'hash', emailVerified: true, adminId: admin._id });
  t.mock.method(Member, 'findOne', () => Promise.resolve(member) as unknown as ReturnType<typeof Member.findOne>);
  const update = t.mock.method(Member, 'findOneAndUpdate', () => { throw new Error('Must not create a second member'); });
  assert.equal(await ensureAdminMember(admin), member);
  assert.equal(update.mock.callCount(), 0);
});
test('trusted admin authentication verifies an existing linked account', async t => {
  const member = new Member({ email: admin.email, password: 'hash', adminId: admin._id, emailVerified: false, emailVerificationCode: '1234', emailVerificationExpiry: new Date() });
  t.mock.method(Member, 'findOne', () => Promise.resolve(member) as unknown as ReturnType<typeof Member.findOne>);
  const save = t.mock.method(member, 'save', () => Promise.resolve(member));
  const result = await ensureAdminMember(admin);
  assert.equal(result.emailVerified, true); assert.equal(result.emailVerificationCode, undefined);
  assert.equal(result.emailVerificationExpiry, undefined); assert.equal(save.mock.callCount(), 1);
});
test('inactive admins cannot create or link member accounts through the bridge', async t => {
  const find = t.mock.method(Member, 'findOne', () => { throw new Error('Should not query'); });
  await assert.rejects(ensureAdminMember({ ...admin, isActive: false }), /Inactive/);
  assert.equal(find.mock.callCount(), 0);
});
test('panel access requires an active admin belonging to the same member identity', () => {
  const identity = { id: admin._id.toString(), email: admin.email, isActive: true };
  assert.equal(adminMatchesMember(identity, { email: admin.email, adminId: identity.id }), true);
  assert.equal(adminMatchesMember(identity, { email: 'previous-email@example.org', adminId: identity.id }), true);
  assert.equal(adminMatchesMember(identity, { email: admin.email.toUpperCase() }), true);
  assert.equal(adminMatchesMember(identity, { email: 'another-user@example.org' }), false);
  assert.equal(adminMatchesMember(identity, { email: admin.email, adminId: new mongoose.Types.ObjectId().toString() }), false);
  assert.equal(adminMatchesMember({ ...identity, isActive: false }, { email: admin.email, adminId: identity.id }), false);
});
test('member JWTs cannot authorize admin APIs, and admin JWTs cannot pretend to be member tokens', async () => {
  const memberToken = await createMemberToken(new mongoose.Types.ObjectId().toString(), admin.email);
  assert.ok(await verifyMemberToken(memberToken));
  assert.equal(await verifyToken(memberToken), null);
  const adminToken = await createToken({ adminId: admin._id.toString(), email: admin.email, role: 'Super Admin' });
  assert.ok(await verifyToken(adminToken));
  assert.equal(await verifyMemberToken(adminToken), null);
});
test('malformed and unknown-role admin tokens are rejected', async () => {
  assert.equal(await verifyToken('invalid-token'), null);
  const unknown = await createToken({ adminId: admin._id.toString(), email: admin.email, role: 'member' });
  assert.equal(await verifyToken(unknown), null);
});

test('administrator password login is disabled in favor of shared Google sign-in', async () => {
  const { POST } = await import('../app/api/admin/login/route');
  assert.equal((await POST()).status, 410);
});
test('member password sign-in, signup and email verification are disabled', async () => {
  const { POST } = await import('../app/api/member/login/route');
  const { POST: signup } = await import('../app/api/member/signup/route');
  const { POST: verifyEmail } = await import('../app/api/member/verify-email/route');
  for (const response of [
    await POST(),
    await signup(),
    await verifyEmail(),
  ]) {
    assert.equal(response.status, 410);
  }
});
test('password recovery and reset are disabled for Google-only accounts', async () => {
  const { POST: requestReset } = await import('../app/api/member/forgot-password/route');
  const { POST: resetPassword } = await import('../app/api/member/reset-password/route');
  assert.equal((await requestReset()).status, 410);
  assert.equal((await resetPassword()).status, 410);
});
test('signing out from either endpoint clears both modes', async t => {
  const memberLogout = await import('../app/api/member/logout/route');
  const adminLogout = await import('../app/api/admin/logout/route');
  const values = mockCookies(t);
  for (const logout of [memberLogout.POST, adminLogout.POST]) {
    values.set('admin-token', 'admin-cookie'); values.set('member-token', 'member-cookie');
    assert.equal((await logout()).status, 200);
    assert.equal(values.has('admin-token'), false); assert.equal(values.has('member-token'), false);
  }
});
test('an existing admin-only session resolves to the same normal member identity', async t => {
  isolatedConnection();
  const staff = new Admin({ ...admin, role: 'Admin' });
  const member = new Member({ email: admin.email, password: 'hash', adminId: staff._id, emailVerified: true });
  const token = await createToken({ adminId: staff._id.toString(), email: staff.email, role: staff.role });
  mockCookies(t, { 'admin-token': token });
  t.mock.method(Admin, 'findById', () => selectedResult(staff) as unknown as ReturnType<typeof Admin.findById>);
  t.mock.method(Member, 'findOne', () => Promise.resolve(member) as unknown as ReturnType<typeof Member.findOne>);
  assert.equal((await getMemberSession())?.memberId, member._id.toString());
  staff.isActive = false;
  assert.equal(await getMemberSession(), null);
});
test('the account endpoint shows Admin Panel only for the matching active admin', async t => {
  isolatedConnection();
  const staff = new Admin({ ...admin, role: 'Admin' });
  const member = new Member({ email: admin.email, password: 'hash', adminId: staff._id, emailVerified: true });
  const memberToken = await createMemberToken(member._id.toString(), member.email);
  const cookies = mockCookies(t, {
    'admin-token': await createToken({ adminId: staff._id.toString(), email: staff.email, role: staff.role }),
    'member-token': memberToken,
  });
  t.mock.method(Admin, 'findById', () => selectedResult(staff) as unknown as ReturnType<typeof Admin.findById>);
  t.mock.method(Member, 'findById', () => selectedResult(member) as unknown as ReturnType<typeof Member.findById>);
  const { GET } = await import('../app/api/member/me/route');
  const body = await (await GET()).json();
  assert.equal(body.member.canAccessAdminPanel, true); assert.equal(body.member.adminRole, 'Admin'); assert.equal('password' in body.member, false);
  // A role change is reflected in the account even if the JWT was issued earlier.
  staff.role = 'Verifier';
  assert.equal((await (await GET()).json()).member.adminRole, 'Verifier');
  staff.role = 'Admin';
  staff.isActive = false;
  // An inactive admin-only session cannot resolve a normal account through the bridge.
  cookies.delete('member-token');
  assert.equal((await GET()).status, 401);
  staff.isActive = true; cookies.set('member-token', memberToken); member.adminId = new mongoose.Types.ObjectId();
  assert.equal((await (await GET()).json()).member.canAccessAdminPanel, false);
});
test('a Google-authenticated member can receive membership approval', async t => {
  isolatedConnection();
  t.mock.method(console, 'error', () => {});
  const memberEmail = 'new-member@example.org';
  const member = new Member({
    email: memberEmail, password: 'google-managed-hash', googleId: 'google-subject-approval',
    emailVerified: true,
  });
  const cookies = mockCookies(t, {
    'member-token': await createMemberToken(member._id.toString(), member.email),
  });
  const request = (url: string, body: unknown) => new NextRequest(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });

  const staff = new Admin({ ...admin, role: 'Super Admin' });
  const adminToken = await createToken({ adminId: staff._id.toString(), email: staff.email, role: staff.role });
  cookies.set('admin-token', adminToken);
  t.mock.method(Admin, 'findById', () => selectedResult(staff) as unknown as ReturnType<typeof Admin.findById>);
  const applicant = new Applicant({
    email: memberEmail, fullName: 'New Member', applicationRef: 'RSSS/2026/010',
    status: 'Pending', paymentStatus: 'paid',
  });
  member.profileComplete = true;
  member.applicantId = applicant._id;
  member.applicationRef = applicant.applicationRef;
  t.mock.method(Applicant, 'findById', () => selectedResult(applicant) as unknown as ReturnType<typeof Applicant.findById>);
  t.mock.method(Applicant, 'countDocuments', () => Promise.resolve(0) as unknown as ReturnType<typeof Applicant.countDocuments>);
  t.mock.method(applicant, 'save', () => Promise.resolve(applicant));
  t.mock.method(AuditLog, 'create', () => Promise.resolve({}) as unknown as ReturnType<typeof AuditLog.create>);

  const { POST: approve } = await import('../app/api/admin/applications/[id]/approve/route');
  const approvalRequest = request(`http://localhost/api/admin/applications/${applicant._id}/approve`, { remarks: 'Verified' });
  const approval = await approve(approvalRequest, { params: Promise.resolve({ id: applicant._id.toString() }) });
  const approvalBody = await approval.json();
  assert.equal(approval.status, 200);
  assert.equal(applicant.status, 'Approved');
  assert.match(approvalBody.membershipNumber, /^RSSSOSAA\/\d{4}\/\d{5}$/);

  const memberToken = cookies.get('member-token')!;
  cookies.delete('admin-token');
  t.mock.method(Member, 'findById', () => selectedResult(member) as unknown as ReturnType<typeof Member.findById>);
  const { GET: getAccount } = await import('../app/api/member/me/route');
  const account = await (await getAccount()).json();
  assert.equal(account.member.status, 'Approved');
  assert.equal(account.member.membershipNumber, approvalBody.membershipNumber);
  assert.ok(await verifyMemberToken(memberToken));
});
