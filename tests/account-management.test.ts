import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import Admin from '../lib/models/Admin';
import Member from '../lib/models/Member';
import Applicant from '../lib/models/Applicant';
import AuditLog from '../lib/models/AuditLog';
import PasswordReset from '../lib/models/PasswordReset';
import DuesPayment from '../lib/models/DuesPayment';
import EventRegistration from '../lib/models/EventRegistration';
import ScholarshipApplication from '../lib/models/ScholarshipApplication';
import { createToken } from '../lib/utils/auth';
import { AccountManagementError, assertManageableAccount, deleteMemberAccount, promoteMember } from '../lib/utils/account-management';
import { HIDDEN_ACCOUNT_EMAIL, visibleAccountFilter } from '../lib/utils/account-visibility';

const actor = { adminId: new mongoose.Types.ObjectId().toString(), email: 'owner@example.org', role: 'Super Admin' };
function isolateDatabase() {
  process.env.MONGODB_URI ||= 'mongodb://127.0.0.1/unused_account_management_tests';
  global.mongoose ||= { conn: null, promise: null }; global.mongoose.conn = mongoose; global.mongoose.promise = null;
}
function query<T>(value: T) {
  const result = Object.assign(Promise.resolve(value), { select: () => result, sort: () => result, skip: () => result, limit: () => result, lean: () => result });
  return result;
}
async function mockSession(t: TestContext, role?: 'Super Admin' | 'Admin' | 'Verifier') {
  isolateDatabase();
  const staff = new Admin({ _id: actor.adminId, email: actor.email, fullName: 'Test Owner', password: 'hash', role: role || 'Super Admin', isActive: true });
  const token = role ? await createToken({ adminId: staff._id.toString(), email: staff.email, role }) : undefined;
  const headers = createRequire(resolve('package.json'))('next/headers') as typeof import('next/headers');
  t.mock.method(headers, 'cookies', () => Promise.resolve({ get: (name: string) => name === 'admin-token' && token ? { value: token } : undefined }) as unknown as ReturnType<typeof headers.cookies>);
  t.mock.method(Admin, 'findById', () => query(staff) as unknown as ReturnType<typeof Admin.findById>);
  return staff;
}
function request(path: string, method = 'GET', data?: unknown) {
  return new NextRequest(`http://localhost${path}`, { method, ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) });
}
const context = (id: string) => ({ params: Promise.resolve({ id }) });

test('account management endpoints require authentication', async t => {
  await mockSession(t);
  const directory = await import('../app/api/admin/accounts/route');
  const deletion = await import('../app/api/admin/accounts/[id]/route');
  const promotion = await import('../app/api/admin/accounts/[id]/role/route');
  assert.equal((await directory.GET(request('/api/admin/accounts'))).status, 401);
  assert.equal((await deletion.DELETE(request('/api/admin/accounts/x', 'DELETE'), context('x'))).status, 401);
  assert.equal((await promotion.POST(request('/api/admin/accounts/x/role', 'POST'), context('x'))).status, 401);
});

for (const role of ['Admin', 'Verifier'] as const) test(`${role} cannot list accounts, promote members, or delete users`, async t => {
  await mockSession(t, role);
  const directory = await import('../app/api/admin/accounts/route');
  const deletion = await import('../app/api/admin/accounts/[id]/route');
  const promotion = await import('../app/api/admin/accounts/[id]/role/route');
  assert.equal((await directory.GET(request('/api/admin/accounts'))).status, 403);
  assert.equal((await deletion.DELETE(request('/api/admin/accounts/x', 'DELETE'), context('x'))).status, 403);
  assert.equal((await promotion.POST(request('/api/admin/accounts/x/role', 'POST'), context('x'))).status, 403);
});

test('the private account is protected from deletion and promotion even for other Super Admins', async t => {
  const member = new Member({ email: HIDDEN_ACCOUNT_EMAIL, password: 'private-hash' });
  t.mock.method(Member, 'findById', () => query(member) as unknown as ReturnType<typeof Member.findById>);
  const write = t.mock.method(Member, 'updateOne', () => { throw new Error('Private account must never be modified'); });
  await assert.rejects(promoteMember(member._id.toString(), 'Admin', actor), { status: 404 });
  await assert.rejects(deleteMemberAccount(member._id.toString(), member.email, actor), { status: 404 });
  assert.equal(write.mock.callCount(), 0);
});

test('the bootstrap Super Admin cannot be deleted or lose its administrator role', async t => {
  const email = 'hillaryprosperwahua@gmail.com';
  const member = new Member({ email, password: 'private-hash' });
  const staff = new Admin({ email, password: 'private-hash', fullName: 'Bootstrap Owner', role: 'Super Admin', isActive: true });
  t.mock.method(Member, 'findById', () => query(member) as unknown as ReturnType<typeof Member.findById>);
  t.mock.method(Admin, 'findOne', () => Promise.resolve(staff) as unknown as ReturnType<typeof Admin.findOne>);
  const memberWrite = t.mock.method(Member, 'updateOne', () => { throw new Error('Bootstrap account must not be deleted'); });
  await assert.rejects(deleteMemberAccount(member._id.toString(), email, actor), { status: 400 });
  assert.equal(memberWrite.mock.callCount(), 0);

  isolateDatabase();
  const current = new Admin({ email: actor.email, fullName: 'Test Owner', password: 'hash', role: 'Super Admin', isActive: true });
  const token = await createToken({ adminId: current._id.toString(), email: current.email, role: current.role });
  const headers = createRequire(resolve('package.json'))('next/headers') as typeof import('next/headers');
  t.mock.method(headers, 'cookies', () => Promise.resolve({ get: (name: string) => name === 'admin-token' ? { value: token } : undefined }) as unknown as ReturnType<typeof headers.cookies>);
  t.mock.method(Admin, 'findById', (id: unknown) => query(String(id) === current._id.toString() ? current : staff) as unknown as ReturnType<typeof Admin.findById>);
  const update = t.mock.method(Admin, 'findByIdAndUpdate', () => { throw new Error('Bootstrap role must not change'); });
  const { PATCH, DELETE } = await import('../app/api/admin/admins/[id]/route');
  const patch = await PATCH(request(`/api/admin/admins/${staff._id}`, 'PATCH', { role: 'Admin' }), context(staff._id.toString()));
  const deletion = await DELETE(request(`/api/admin/admins/${staff._id}`, 'DELETE'), context(staff._id.toString()));
  assert.equal(patch.status, 400);
  assert.equal(deletion.status, 400);
  assert.equal(update.mock.callCount(), 0);
});

test('promoting a member preserves their original password, draft, form, and registration payment link', async t => {
  const member = new Member({ email: 'member@example.org', password: 'member-original-password-hash', fullName: 'Existing Member', emailVerified: true, profileComplete: true, applicantId: new mongoose.Types.ObjectId(), formDraft: { skills: ['Teaching'] } });
  const profile = { applicantId: member.applicantId, formDraft: member.formDraft, password: member.password };
  t.mock.method(Member, 'findById', () => query(member) as unknown as ReturnType<typeof Member.findById>);
  t.mock.method(Admin, 'findOne', () => Promise.resolve(null) as unknown as ReturnType<typeof Admin.findOne>);
  t.mock.method(Member, 'findOne', () => Promise.resolve(null) as unknown as ReturnType<typeof Member.findOne>);
  let created: Record<string, unknown> = {}, linked: { $set: Record<string, unknown> } | undefined;
  t.mock.method(Admin, 'create', (values: unknown) => { created = values as typeof created; return Promise.resolve(new Admin(created)) as unknown as ReturnType<typeof Admin.create>; });
  t.mock.method(Member, 'findOneAndUpdate', (_filter: unknown, update: unknown) => { linked = update as typeof linked; return Promise.resolve(member) as unknown as ReturnType<typeof Member.findOneAndUpdate>; });
  const audit = t.mock.method(AuditLog, 'create', () => Promise.resolve({}) as unknown as ReturnType<typeof AuditLog.create>);
  const result = await promoteMember(member._id.toString(), 'Admin', actor);
  assert.equal(result.role, 'Admin'); assert.equal(created.password, profile.password); assert.equal(created.email, member.email);
  for (const field of ['password', 'profileComplete', 'applicantId', 'formDraft']) assert.equal(field in linked!.$set, false);
  assert.equal(member.applicantId, profile.applicantId); assert.deepEqual(member.formDraft, profile.formDraft); assert.equal(audit.mock.callCount(), 1);
});

test('inactive admin access is restored using the current member password', async t => {
  const member = new Member({ email: 'member@example.org', password: 'current-member-password', fullName: 'Existing Member', emailVerified: true });
  const oldAdmin = new Admin({ email: member.email, password: 'outdated-admin-password', fullName: member.fullName, role: 'Admin', isActive: false });
  t.mock.method(Member, 'findById', () => query(member) as unknown as ReturnType<typeof Member.findById>);
  t.mock.method(Admin, 'findOne', () => Promise.resolve(oldAdmin) as unknown as ReturnType<typeof Admin.findOne>);
  t.mock.method(Member, 'findOne', () => Promise.resolve(null) as unknown as ReturnType<typeof Member.findOne>);
  let changed: { $set: Record<string, unknown> } | undefined;
  t.mock.method(Admin, 'findByIdAndUpdate', (_id: unknown, update: unknown) => { changed = update as typeof changed; Object.assign(oldAdmin, changed!.$set); return Promise.resolve(oldAdmin) as unknown as ReturnType<typeof Admin.findByIdAndUpdate>; });
  t.mock.method(Member, 'findOneAndUpdate', () => Promise.resolve(member) as unknown as ReturnType<typeof Member.findOneAndUpdate>);
  t.mock.method(AuditLog, 'create', () => Promise.resolve({}) as unknown as ReturnType<typeof AuditLog.create>);
  await promoteMember(member._id.toString(), 'Verifier', actor);
  assert.equal(changed!.$set.password, member.password); assert.equal(changed!.$set.isActive, true); assert.equal(changed!.$set.role, 'Verifier'); assert.ok(changed!.$set.passwordChangedAt instanceof Date);
});

test('account deletion requires an exact email confirmation before making changes', async t => {
  const member = new Member({ email: 'member@example.org', password: 'hash' });
  t.mock.method(Member, 'findById', () => Promise.resolve(member) as unknown as ReturnType<typeof Member.findById>);
  const write = t.mock.method(Member, 'updateOne', () => { throw new Error('Must not modify'); });
  await assert.rejects(deleteMemberAccount(member._id.toString(), 'wrong@example.org', actor), { status: 400 });
  assert.equal(write.mock.callCount(), 0);
});

test('self deletion, deleted accounts, and non-Super Admin helper calls are refused', async () => {
  const id = new mongoose.Types.ObjectId();
  assert.throws(() => assertManageableAccount({ _id: id, email: actor.email, adminId: new mongoose.Types.ObjectId(actor.adminId) }, actor), AccountManagementError);
  assert.throws(() => assertManageableAccount({ _id: id, email: 'deleted@example.org', isDeleted: true }, actor), { status: 404 });
  await assert.rejects(promoteMember(id.toString(), 'Admin', { ...actor, role: 'Admin' }), { status: 403 });
  await assert.rejects(deleteMemberAccount(id.toString(), 'member@example.org', { ...actor, role: 'Verifier' }), { status: 403 });
});

test('deletion invalidates access and personal data while retaining transaction evidence', async t => {
  const member = new Member({ email: 'member@example.org', password: 'hash', fullName: 'Existing Member', emailVerified: true, profileComplete: true, applicantId: new mongoose.Types.ObjectId() });
  const staff = new Admin({ email: member.email, password: 'hash', fullName: member.fullName, role: 'Admin' }); member.adminId = staff._id;
  t.mock.method(Member, 'findById', () => Promise.resolve(member) as unknown as ReturnType<typeof Member.findById>);
  t.mock.method(Admin, 'findById', () => Promise.resolve(staff) as unknown as ReturnType<typeof Admin.findById>);
  let removedMember: { $set: Record<string, unknown>; $unset: Record<string, unknown> } | undefined;
  let redactedApplicant: { $set: Record<string, unknown>; $unset: Record<string, unknown> } | undefined;
  t.mock.method(Member, 'updateOne', (_filter: unknown, update: unknown) => { removedMember = update as typeof removedMember; return Promise.resolve({}) as unknown as ReturnType<typeof Member.updateOne>; });
  const removedAdmin = t.mock.method(Admin, 'updateOne', () => Promise.resolve({}) as unknown as ReturnType<typeof Admin.updateOne>);
  const reset = t.mock.method(PasswordReset, 'deleteMany', () => Promise.resolve({}) as unknown as ReturnType<typeof PasswordReset.deleteMany>);
  t.mock.method(Applicant, 'updateOne', (_filter: unknown, update: unknown) => { redactedApplicant = update as typeof redactedApplicant; return Promise.resolve({}) as unknown as ReturnType<typeof Applicant.updateOne>; });
  const events = t.mock.method(EventRegistration, 'updateMany', () => Promise.resolve({}) as unknown as ReturnType<typeof EventRegistration.updateMany>);
  t.mock.method(ScholarshipApplication, 'updateMany', () => Promise.resolve({}) as unknown as ReturnType<typeof ScholarshipApplication.updateMany>);
  const financialDelete = t.mock.method(DuesPayment, 'deleteMany', () => { throw new Error('Do not delete payment evidence'); });
  const audit = t.mock.method(AuditLog, 'create', () => Promise.resolve({}) as unknown as ReturnType<typeof AuditLog.create>);
  await deleteMemberAccount(member._id.toString(), member.email, actor);
  assert.equal(removedMember!.$set.isDeleted, true); assert.equal(removedMember!.$set.emailVerified, false); assert.equal(removedMember!.$set.fullName, 'Deleted member'); assert.match(String(removedMember!.$set.email), /^deleted-/); assert.ok(removedMember!.$set.passwordChangedAt instanceof Date);
  for (const field of ['paymentAmount', 'paymentStatus', 'paymentRef', 'membershipNumber', 'paidAt']) assert.equal(field in redactedApplicant!.$set || field in redactedApplicant!.$unset, false, field);
  assert.equal(redactedApplicant!.$set.fullName, 'Deleted member'); assert.equal(financialDelete.mock.callCount(), 0); assert.equal(events.mock.callCount(), 1); assert.equal(removedAdmin.mock.callCount(), 1); assert.equal(reset.mock.callCount(), 1); assert.equal(audit.mock.callCount(), 1);
});

for (const role of ['Super Admin', 'Admin'] as const) test(`${role} administrator directory never includes the private account`, async t => {
  await mockSession(t, role);
  let filter: Record<string, unknown> = {};
  t.mock.method(Admin, 'find', (value: unknown) => { filter = value as typeof filter; return query([]) as unknown as ReturnType<typeof Admin.find>; });
  const { GET } = await import('../app/api/admin/admins/route');
  assert.equal((await GET()).status, 200); assert.deepEqual(filter.email, visibleAccountFilter.email); assert.deepEqual(filter.isDeleted, { $ne: true });
  if (role === 'Admin') assert.deepEqual(filter.role, { $ne: 'Super Admin' });
});

test('Super Admin users directory includes incomplete and unverified accounts without credentials', async t => {
  await mockSession(t, 'Super Admin');
  const member = new Member({ email: 'unfinished@example.org', password: 'secret-hash', emailVerified: false, profileComplete: false }).toObject();
  let filter: Record<string, unknown> = {};
  t.mock.method(Member, 'find', (value: unknown) => { filter = value as typeof filter; return query([member]) as unknown as ReturnType<typeof Member.find>; });
  t.mock.method(Member, 'countDocuments', () => Promise.resolve(1) as unknown as ReturnType<typeof Member.countDocuments>);
  t.mock.method(Admin, 'find', () => query([]) as unknown as ReturnType<typeof Admin.find>);
  t.mock.method(Applicant, 'find', () => query([]) as unknown as ReturnType<typeof Applicant.find>);
  const { GET } = await import('../app/api/admin/accounts/route');
  const response = await GET(request('/api/admin/accounts?search=unfinished&page=1'));
  assert.equal(response.status, 200); const body = await response.json();
  assert.equal(body.accounts.length, 1); assert.equal(body.accounts[0].emailVerified, false); assert.equal(body.accounts[0].applicationStatus, 'No form'); assert.equal('password' in body.accounts[0], false); assert.deepEqual(filter.email, visibleAccountFilter.email); assert.equal('status' in filter, false);
});

test('private administrator direct edits and revocation return not found without writes', async t => {
  const current = await mockSession(t, 'Super Admin');
  const hidden = new Admin({ email: HIDDEN_ACCOUNT_EMAIL, fullName: 'Private Owner', password: 'hash', role: 'Super Admin', isActive: true });
  t.mock.method(Admin, 'findById', (id: unknown) => query(String(id) === current._id.toString() ? current : hidden) as unknown as ReturnType<typeof Admin.findById>);
  const write = t.mock.method(Admin, 'updateOne', () => { throw new Error('Must not modify private account'); });
  const { PATCH, DELETE } = await import('../app/api/admin/admins/[id]/route');
  assert.equal((await PATCH(request(`/api/admin/admins/${hidden._id}`, 'PATCH', { role: 'Verifier' }), context(hidden._id.toString()))).status, 404);
  assert.equal((await DELETE(request(`/api/admin/admins/${hidden._id}`, 'DELETE'), context(hidden._id.toString()))).status, 404);
  assert.equal(write.mock.callCount(), 0);
});

test('revoking admin access unlinks the panel but keeps the regular member account', async t => {
  const current = await mockSession(t, 'Super Admin');
  const staff = new Admin({ email: 'staff@example.org', fullName: 'Existing Staff', password: 'hash', role: 'Admin', isActive: true });
  t.mock.method(Admin, 'findById', (id: unknown) => query(String(id) === current._id.toString() ? current : staff) as unknown as ReturnType<typeof Admin.findById>);
  let adminChange: unknown, memberChange: unknown;
  t.mock.method(Admin, 'updateOne', (_filter: unknown, change: unknown) => { adminChange = change; return Promise.resolve({}) as unknown as ReturnType<typeof Admin.updateOne>; });
  t.mock.method(Member, 'updateOne', (_filter: unknown, change: unknown) => { memberChange = change; return Promise.resolve({}) as unknown as ReturnType<typeof Member.updateOne>; });
  const removeMember = t.mock.method(Member, 'deleteOne', () => { throw new Error('Regular account must survive'); });
  t.mock.method(AuditLog, 'create', () => Promise.resolve({}) as unknown as ReturnType<typeof AuditLog.create>);
  const { DELETE } = await import('../app/api/admin/admins/[id]/route');
  assert.equal((await DELETE(request(`/api/admin/admins/${staff._id}`, 'DELETE'), context(staff._id.toString()))).status, 200);
  assert.deepEqual(adminChange, { $set: { isActive: false } }); assert.deepEqual(memberChange, { $unset: { adminId: '' } }); assert.equal(removeMember.mock.callCount(), 0);
});
