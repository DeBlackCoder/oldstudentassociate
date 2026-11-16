import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import Admin from '../lib/models/Admin';
import Member from '../lib/models/Member';
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
function loginRequest() {
  return new NextRequest('http://localhost/api/member/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: admin.email, password: 'test-password' }) });
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

test('the real login route sets both sessions and sends admins to the normal dashboard', async t => {
  isolatedConnection(); const cookies = mockCookies(t);
  const staff = new Admin({ ...admin, role: 'Super Admin', password: await bcrypt.hash('test-password', 4) });
  const member = new Member({ email: admin.email, password: 'member-hash', adminId: staff._id, emailVerified: true });
  t.mock.method(Admin, 'findOne', () => ({ select: () => Promise.resolve(staff) }) as unknown as ReturnType<typeof Admin.findOne>);
  t.mock.method(staff, 'save', () => Promise.resolve(staff));
  t.mock.method(Member, 'findOne', () => Promise.resolve(member) as unknown as ReturnType<typeof Member.findOne>);
  const { POST } = await import('../app/api/member/login/route');
  const response = await POST(loginRequest());
  assert.equal(response.status, 200);
  const body = await response.json(); assert.equal(body.redirectTo, '/members/dashboard'); assert.equal(body.role, 'admin');
  const adminSession = await verifyToken(cookies.get('admin-token')!);
  const memberSession = await verifyMemberToken(cookies.get('member-token')!);
  assert.equal(adminSession?.adminId, staff._id.toString()); assert.equal(memberSession?.memberId, member._id.toString());
});
test('normal member login clears a previous account’s admin session', async t => {
  isolatedConnection(); const cookies = mockCookies(t, { 'admin-token': 'previous-admin-cookie' });
  const member = new Member({ email: admin.email, password: await bcrypt.hash('test-password', 4), emailVerified: true });
  t.mock.method(Admin, 'findOne', () => ({ select: () => Promise.resolve(null) }) as unknown as ReturnType<typeof Admin.findOne>);
  t.mock.method(Member, 'findOne', () => ({ select: () => Promise.resolve(member) }) as unknown as ReturnType<typeof Member.findOne>);
  const { POST } = await import('../app/api/member/login/route');
  const response = await POST(loginRequest());
  assert.equal(response.status, 200); assert.equal(cookies.has('admin-token'), false);
  assert.equal((await verifyMemberToken(cookies.get('member-token')!))?.memberId, member._id.toString());
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
