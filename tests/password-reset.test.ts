import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Admin from '../lib/models/Admin';
import Member from '../lib/models/Member';
import PasswordReset from '../lib/models/PasswordReset';
import { PasswordResetError, requestPasswordReset, resetAccountPassword } from '../lib/utils/password-reset';
import {
  RESET_EXPIRY_MS, forgotPasswordSchema, generateResetToken, hashResetToken,
  passwordResetUrl, resetPasswordSchema, sessionSurvivesPasswordChange,
} from '../lib/utils/password-reset-policy';

const token = 'a'.repeat(64);
const password = 'new-password-2026';
function selected(value: unknown) { return { select: () => Promise.resolve(value) }; }
function resetRecord(overrides: Record<string, unknown> = {}) {
  return new PasswordReset({ accountKey: 'member:fixture', memberId: new mongoose.Types.ObjectId(), tokenHash: hashResetToken(token), requestedAt: new Date(), expiresAt: new Date(Date.now() + RESET_EXPIRY_MS), ...overrides });
}
function claim(context: TestContext, record: ReturnType<typeof resetRecord> | null) {
  const calls: unknown[][] = [];
  context.mock.method(PasswordReset, 'findOneAndUpdate', (...args: unknown[]) => {
    calls.push(args); return Promise.resolve(record) as unknown as ReturnType<typeof PasswordReset.findOneAndUpdate>;
  });
  return calls;
}
function applicationUrl(context: TestContext) {
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = 'https://portal.example.org';
  context.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous;
  });
}

test('reset tokens have 256 random bits and only a digest is stored', () => {
  const first = generateResetToken(); const second = generateResetToken();
  assert.match(first.token, /^[a-f\d]{64}$/);
  assert.notEqual(first.token, second.token);
  assert.equal(first.tokenHash, hashResetToken(first.token));
  assert.notEqual(first.tokenHash, first.token);
});

test('email input is normalized and operator objects cannot pass validation', () => {
  assert.equal(forgotPasswordSchema.parse({ email: ' MEMBER@Example.org ' }).email, 'member@example.org');
  assert.equal(forgotPasswordSchema.safeParse({ email: { $ne: null } }).success, false);
  assert.equal(forgotPasswordSchema.safeParse({ email: 'invalid' }).success, false);
});

test('reset validation rejects short, oversized and bcrypt-truncated Unicode passwords', () => {
  assert.equal(resetPasswordSchema.safeParse({ token, password }).success, true);
  for (const invalid of ['short', 'x'.repeat(73), '😀'.repeat(20)]) {
    assert.equal(resetPasswordSchema.safeParse({ token, password: invalid }).success, false);
  }
  assert.equal(resetPasswordSchema.safeParse({ token: 'guessed', password }).success, false);
});

test('password changes invalidate older sessions including legacy tokens', () => {
  const changedAt = new Date('2026-10-07T12:00:00.500Z');
  assert.equal(sessionSurvivesPasswordChange({ issuedAtMs: changedAt.getTime() - 1 }, changedAt), false);
  assert.equal(sessionSurvivesPasswordChange({ issuedAtMs: changedAt.getTime() + 1 }, changedAt), true);
  assert.equal(sessionSurvivesPasswordChange({ iat: changedAt.getTime() / 1000 - 1 }, changedAt), false);
  assert.equal(sessionSurvivesPasswordChange({}, changedAt), false);
  assert.equal(sessionSurvivesPasswordChange({ issuedAtMs: NaN }, changedAt), false);
  assert.equal(sessionSurvivesPasswordChange({}, undefined), true);
});

test('recovery URLs use the configured portal origin', context => {
  applicationUrl(context);
  const url = new URL(passwordResetUrl(token));
  assert.equal(url.origin, 'https://portal.example.org');
  assert.equal(url.pathname, '/reset-password');
  assert.equal(url.searchParams.get('token'), token);
});

test('missing, expired or previously claimed tokens never write a password', async context => {
  const calls = claim(context, null);
  const update = context.mock.method(Member, 'updateOne', () => { throw new Error('Must not update an account'); });
  await assert.rejects(resetAccountPassword(token, password), PasswordResetError);
  const filter = calls[0][0] as { tokenHash: string; expiresAt: { $gt: Date }; consumedAt: { $exists: boolean } };
  assert.equal(filter.tokenHash, hashResetToken(token));
  assert.ok(filter.expiresAt.$gt instanceof Date);
  assert.equal(filter.consumedAt.$exists, false);
  assert.equal(update.mock.callCount(), 0);
});

test('a member reset claims the token before writing a hashed password and timestamp', async context => {
  const record = resetRecord(); claim(context, record);
  const writes: unknown[][] = [];
  context.mock.method(Member, 'updateOne', (...args: unknown[]) => {
    writes.push(args); return Promise.resolve({ matchedCount: 1 }) as unknown as ReturnType<typeof Member.updateOne>;
  });
  const adminUpdate = context.mock.method(Admin, 'updateOne', () => { throw new Error('Must not update admin'); });
  await resetAccountPassword(token, password);
  const [filter, update] = writes[0] as [{ _id: mongoose.Types.ObjectId; adminId: { $exists: boolean } }, { $set: { password: string; passwordChangedAt: Date } }];
  assert.equal(filter._id.toString(), record.memberId!.toString());
  assert.equal(filter.adminId.$exists, false);
  assert.ok(await bcrypt.compare(password, update.$set.password));
  assert.ok(update.$set.passwordChangedAt instanceof Date);
  assert.equal(adminUpdate.mock.callCount(), 0);
});

test('active linked admin and member accounts receive the same password hash and change time', async context => {
  const staff = new Admin({ fullName: 'Fixture Admin', email: 'admin@example.org', password: 'old-hash', isActive: true });
  const member = new Member({ email: staff.email, password: 'old-hash', adminId: staff._id });
  claim(context, resetRecord({ accountKey: `admin:${staff._id}`, adminId: staff._id, memberId: member._id }));
  context.mock.method(Admin, 'findById', () => selected(staff) as unknown as ReturnType<typeof Admin.findById>);
  context.mock.method(Member, 'findOne', () => selected(member) as unknown as ReturnType<typeof Member.findOne>);
  let adminWrite: unknown[] = []; let memberWrite: unknown[] = [];
  context.mock.method(Admin, 'updateOne', (...args: unknown[]) => { adminWrite = args; return Promise.resolve({ matchedCount: 1 }) as unknown as ReturnType<typeof Admin.updateOne>; });
  context.mock.method(Member, 'updateOne', (...args: unknown[]) => { memberWrite = args; return Promise.resolve({ matchedCount: 1 }) as unknown as ReturnType<typeof Member.updateOne>; });
  await resetAccountPassword(token, password);
  const adminSet = (adminWrite[1] as { $set: { password: string; passwordChangedAt: Date } }).$set;
  const memberSet = (memberWrite[1] as { $set: typeof adminSet }).$set;
  assert.equal(adminSet.password, memberSet.password);
  assert.equal(adminSet.passwordChangedAt.getTime(), memberSet.passwordChangedAt.getTime());
  assert.ok(await bcrypt.compare(password, adminSet.password));
  assert.equal((memberWrite[0] as { _id: mongoose.Types.ObjectId })._id.toString(), member._id.toString());
  assert.equal('emailVerified' in memberSet, false);
});

test('an inactive administrator cannot recover access through a reset token', async context => {
  const staff = new Admin({ fullName: 'Disabled Admin', email: 'disabled@example.org', password: 'old-hash', isActive: false });
  claim(context, resetRecord({ adminId: staff._id }));
  context.mock.method(Admin, 'findById', () => selected(staff) as unknown as ReturnType<typeof Admin.findById>);
  const update = context.mock.method(Admin, 'updateOne', () => { throw new Error('Must not update'); });
  await assert.rejects(resetAccountPassword(token, password), /unavailable/);
  assert.equal(update.mock.callCount(), 0);
});

test('a database write failure releases the claim so the same link can be retried', async context => {
  const record = resetRecord(); claim(context, record);
  context.mock.method(Member, 'updateOne', () => Promise.reject(new Error('Temporary database failure')) as unknown as ReturnType<typeof Member.updateOne>);
  const release = context.mock.method(PasswordReset, 'updateOne', () => Promise.resolve({ matchedCount: 1 }) as unknown as ReturnType<typeof PasswordReset.updateOne>);
  await assert.rejects(resetAccountPassword(token, password), /Temporary database failure/);
  const [filter, update] = release.mock.calls[0].arguments as unknown as [{ _id: mongoose.Types.ObjectId; consumedAt: Date }, { $unset: { consumedAt: string } }];
  assert.equal(filter._id.toString(), record._id.toString());
  assert.ok(filter.consumedAt instanceof Date);
  assert.equal(update.$unset.consumedAt, '');
});

test('a missing account returns without creating a token or sending email', async context => {
  context.mock.method(Admin, 'findOne', () => selected(null) as unknown as ReturnType<typeof Admin.findOne>);
  context.mock.method(Member, 'findOne', () => selected(null) as unknown as ReturnType<typeof Member.findOne>);
  const init = context.mock.method(PasswordReset, 'init', () => { throw new Error('Must not create a token'); });
  await requestPasswordReset('unknown@example.org', async () => { throw new Error('Must not send email'); });
  assert.equal(init.mock.callCount(), 0);
});

test('a recovery request persists only a digest and sends the token exclusively by email', async context => {
  applicationUrl(context);
  const member = new Member({ email: 'member@example.org', password: 'old-hash' });
  context.mock.method(Admin, 'findOne', () => selected(null) as unknown as ReturnType<typeof Admin.findOne>);
  context.mock.method(Member, 'findOne', () => selected(member) as unknown as ReturnType<typeof Member.findOne>);
  context.mock.method(PasswordReset, 'init', () => Promise.resolve(PasswordReset) as unknown as ReturnType<typeof PasswordReset.init>);
  const calls = claim(context, resetRecord({ memberId: member._id }));
  let sentTo = ''; let sentUrl = '';
  await requestPasswordReset(member.email, async (email, url) => { sentTo = email; sentUrl = url; });
  assert.equal(sentTo, member.email);
  const emailedToken = new URL(sentUrl).searchParams.get('token')!;
  const written = (calls[0][1] as { $set: { tokenHash: string; expiresAt: Date; requestedAt: Date } }).$set;
  assert.equal(written.tokenHash, hashResetToken(emailedToken));
  assert.equal(written.expiresAt.getTime() - written.requestedAt.getTime(), RESET_EXPIRY_MS);
  assert.equal(JSON.stringify(written).includes(emailedToken), false);
});

test('concurrent requests or cooldown collisions do not send another recovery email', async context => {
  applicationUrl(context);
  const member = new Member({ email: 'member@example.org', password: 'old-hash' });
  context.mock.method(Admin, 'findOne', () => selected(null) as unknown as ReturnType<typeof Admin.findOne>);
  context.mock.method(Member, 'findOne', () => selected(member) as unknown as ReturnType<typeof Member.findOne>);
  context.mock.method(PasswordReset, 'init', () => Promise.resolve(PasswordReset) as unknown as ReturnType<typeof PasswordReset.init>);
  context.mock.method(PasswordReset, 'findOneAndUpdate', () => Promise.reject(Object.assign(new Error('Unique key collision'), { code: 11000 })) as unknown as ReturnType<typeof PasswordReset.findOneAndUpdate>);
  await requestPasswordReset(member.email, async () => { throw new Error('Must not send another email'); });
});

test('an older linked member email delivers recovery only to the current admin address', async context => {
  applicationUrl(context);
  const staff = new Admin({ fullName: 'Renamed Admin', email: 'current-admin@example.org', password: 'old-hash', isActive: true });
  const member = new Member({ email: 'previous-admin@example.org', password: 'old-hash', adminId: staff._id });
  context.mock.method(Admin, 'findOne', () => selected(null) as unknown as ReturnType<typeof Admin.findOne>);
  context.mock.method(Admin, 'findById', () => selected(staff) as unknown as ReturnType<typeof Admin.findById>);
  context.mock.method(Member, 'findOne', () => selected(member) as unknown as ReturnType<typeof Member.findOne>);
  context.mock.method(PasswordReset, 'init', () => Promise.resolve(PasswordReset) as unknown as ReturnType<typeof PasswordReset.init>);
  const calls = claim(context, resetRecord({ adminId: staff._id, memberId: member._id }));
  let deliveryAddress = '';
  await requestPasswordReset(member.email, async email => { deliveryAddress = email; });
  assert.equal(deliveryAddress, staff.email);
  assert.equal((calls[0][0] as { accountKey: string }).accountKey, `admin:${staff._id}`);
});

test('failed email delivery deletes the unusable request so a retry is allowed', async context => {
  applicationUrl(context);
  const member = new Member({ email: 'member@example.org', password: 'old-hash' });
  context.mock.method(Admin, 'findOne', () => selected(null) as unknown as ReturnType<typeof Admin.findOne>);
  context.mock.method(Member, 'findOne', () => selected(member) as unknown as ReturnType<typeof Member.findOne>);
  context.mock.method(PasswordReset, 'init', () => Promise.resolve(PasswordReset) as unknown as ReturnType<typeof PasswordReset.init>);
  const record = resetRecord(); claim(context, record);
  const remove = context.mock.method(PasswordReset, 'deleteOne', () => Promise.resolve({ deletedCount: 1 }) as unknown as ReturnType<typeof PasswordReset.deleteOne>);
  await assert.rejects(requestPasswordReset(member.email, async () => { throw new Error('SMTP unavailable'); }), /could not be delivered/);
  assert.equal(remove.mock.callCount(), 1);
});
