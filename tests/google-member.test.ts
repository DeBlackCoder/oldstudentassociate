import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Admin from '../lib/models/Admin';
import Member from '../lib/models/Member';

function isolatedConnection() {
  process.env.MONGODB_URI ||= 'mongodb://127.0.0.1/unused_google_member_test_database';
  global.mongoose ||= { conn: null, promise: null };
  global.mongoose.conn = mongoose;
  global.mongoose.promise = null;
}

test('Google sign-in links a verified identity without replacing existing member data', async t => {
  isolatedConnection();
  const { ensureGoogleMember } = await import('../lib/utils/google-member');
  const member = new Member({
    email: 'member@example.org',
    password: 'existing-password-hash',
    emailVerified: false,
    emailVerificationCode: '1234',
    emailVerificationExpiry: new Date(),
    profileComplete: true,
    applicationRef: 'RSSS/2026/001',
    fullName: 'Existing Member',
  });
  let lookupCount = 0;
  t.mock.method(Member, 'findOne', () => {
    lookupCount += 1;
    return Promise.resolve(lookupCount === 1 ? null : member) as unknown as ReturnType<typeof Member.findOne>;
  });
  const save = t.mock.method(member, 'save', () => Promise.resolve(member));

  const result = await ensureGoogleMember({
    googleId: 'google-subject-1',
    email: 'MEMBER@example.org',
    name: 'Updated Name',
  });

  assert.equal(result, member);
  assert.equal(member.googleId, 'google-subject-1');
  assert.equal(member.emailVerified, true);
  assert.equal(member.emailVerificationCode, undefined);
  assert.equal(member.emailVerificationExpiry, undefined);
  assert.equal(member.password, 'existing-password-hash');
  assert.equal(member.profileComplete, true);
  assert.equal(member.applicationRef, 'RSSS/2026/001');
  assert.equal(member.fullName, 'Existing Member');
  assert.equal(save.mock.callCount(), 1);
});

test('Google sign-in creates a verified member account for a new identity', async t => {
  isolatedConnection();
  const { ensureGoogleMember } = await import('../lib/utils/google-member');
  t.mock.method(Member, 'findOne', () => Promise.resolve(null) as unknown as ReturnType<typeof Member.findOne>);
  let created: Record<string, unknown> | undefined;
  t.mock.method(Member, 'create', (document: unknown) => {
    created = document as Record<string, unknown>;
    return Promise.resolve(new Member({ ...created, _id: new mongoose.Types.ObjectId() }));
  });

  const result = await ensureGoogleMember({
    googleId: 'google-subject-2',
    email: 'new-member@example.org',
    name: 'New Member',
  });

  assert.equal(result.email, 'new-member@example.org');
  assert.equal(result.googleId, 'google-subject-2');
  assert.equal(result.emailVerified, true);
  assert.equal(result.profileComplete, false);
  assert.equal(result.fullName, 'New Member');
  assert.equal(typeof result.password, 'string');
  assert.equal(result.password.length > 0, true);
  assert.equal(created?.password, result.password);
});

test('Google sign-in rejects deleted accounts and conflicting identity links', async t => {
  isolatedConnection();
  const { ensureGoogleMember } = await import('../lib/utils/google-member');
  const deletedMember = new Member({
    email: 'deleted@example.org',
    password: 'hash',
    isDeleted: true,
  });
  const linkedMember = new Member({
    email: 'linked@example.org',
    password: 'hash',
    googleId: 'different-google-subject',
  });
  t.mock.method(Member, 'findOne', (filter: { email?: string }) => {
    if (filter.email === 'deleted@example.org') return Promise.resolve(deletedMember);
    if (filter.email === 'linked@example.org') return Promise.resolve(linkedMember);
    return Promise.resolve(null);
  });
  await assert.rejects(
    ensureGoogleMember({ googleId: 'google-subject-3', email: 'deleted@example.org' }),
    /Deleted accounts cannot sign in/,
  );

  await assert.rejects(
    ensureGoogleMember({ googleId: 'google-subject-4', email: 'linked@example.org' }),
    /linked to a different Google account/,
  );
});

test('shared Google sign-in grants an active administrator both sessions identities', async t => {
  isolatedConnection();
  const { resolveGoogleSignInAccount } = await import('../lib/utils/google-auth');
  const staff = new Admin({
    email: 'admin@example.org',
    password: 'legacy-password-hash',
    fullName: 'Association Admin',
    role: 'Super Admin',
    isActive: true,
  });
  const member = new Member({
    email: staff.email,
    password: 'member-password-hash',
    emailVerified: true,
    profileComplete: false,
  });
  t.mock.method(Admin, 'findOne', () => Promise.resolve(staff) as unknown as ReturnType<typeof Admin.findOne>);
  t.mock.method(Member, 'findOne', (filter: { googleId?: string; email?: string; adminId?: unknown }) => {
    if (filter.googleId) return Promise.resolve(null);
    if (filter.email) return Promise.resolve(member);
    if (filter.adminId) return Promise.resolve(null);
    return Promise.resolve(null);
  });
  const saveMember = t.mock.method(member, 'save', () => Promise.resolve(member));
  t.mock.method(Member, 'findOneAndUpdate', () => Promise.resolve(member) as unknown as ReturnType<typeof Member.findOneAndUpdate>);
  const saveAdmin = t.mock.method(staff, 'save', () => Promise.resolve(staff));

  const account = await resolveGoogleSignInAccount({
    googleId: 'google-admin-subject',
    email: 'ADMIN@example.org',
    name: 'Google Name',
  });

  assert.ok(account?.admin);
  assert.equal(account.admin._id.toString(), staff._id.toString());
  assert.equal(account.member, member);
  assert.equal(member.googleId, 'google-admin-subject');
  assert.ok(staff.lastLogin instanceof Date);
  assert.equal(saveMember.mock.callCount(), 1);
  assert.equal(saveAdmin.mock.callCount(), 1);
});

test('the bootstrap Google account is provisioned as Super Admin without an application', async t => {
  isolatedConnection();
  const { resolveGoogleSignInAccount } = await import('../lib/utils/google-auth');
  const email = 'hillaryprosperwahua@gmail.com';
  let member: InstanceType<typeof Member> | undefined;
  t.mock.method(Admin, 'findOne', () => Promise.resolve(null) as unknown as ReturnType<typeof Admin.findOne>);
  t.mock.method(Admin, 'findOneAndUpdate', (_filter: unknown, update: unknown) => {
    const values = update as { $set: Record<string, unknown>; $setOnInsert: Record<string, unknown> };
    const admin = new Admin({ ...values.$setOnInsert, ...values.$set, email });
    return Promise.resolve(admin) as unknown as ReturnType<typeof Admin.findOneAndUpdate>;
  });
  t.mock.method(Member, 'findOne', () => Promise.resolve(null) as unknown as ReturnType<typeof Member.findOne>);
  t.mock.method(Member, 'create', (document: Record<string, unknown>) => {
    member = new Member(document);
    return Promise.resolve(member) as unknown as ReturnType<typeof Member.create>;
  });
  t.mock.method(Member, 'findOneAndUpdate', (_filter: unknown, update: unknown) => {
    const values = update as { $set: Record<string, unknown> };
    Object.assign(member!, values.$set);
    return Promise.resolve(member) as unknown as ReturnType<typeof Member.findOneAndUpdate>;
  });

  const account = await resolveGoogleSignInAccount({
    googleId: 'google-bootstrap-super-admin',
    email: email.toUpperCase(),
    name: 'Hillary Prosper Wahua',
  });

  assert.equal(account?.admin?.email, email);
  assert.equal(account?.admin?.role, 'Super Admin');
  assert.equal(account?.admin?.isActive, true);
  assert.equal(account?.member, member);
  assert.equal(member?.adminId?.toString(), account?.admin?._id.toString());
  assert.equal(member?.emailVerified, true);
  assert.equal(member?.profileComplete, false);
  assert.equal(member?.applicantId, undefined);
  assert.equal(member?.applicationRef, undefined);
});

test('shared Google sign-in rejects inactive administrator accounts', async t => {
  isolatedConnection();
  const { resolveGoogleSignInAccount } = await import('../lib/utils/google-auth');
  const staff = new Admin({
    email: 'inactive@example.org',
    password: 'legacy-password-hash',
    fullName: 'Inactive Admin',
    isActive: false,
  });
  t.mock.method(Admin, 'findOne', () => Promise.resolve(staff) as unknown as ReturnType<typeof Admin.findOne>);
  const memberLookup = t.mock.method(Member, 'findOne', () => {
    throw new Error('Inactive admins must not be provisioned as members');
  });

  assert.equal(await resolveGoogleSignInAccount({
    googleId: 'google-inactive-subject',
    email: 'inactive@example.org',
  }), null);
  assert.equal(memberLookup.mock.callCount(), 0);
});
