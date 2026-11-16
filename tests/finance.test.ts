import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import Member from '../lib/models/Member';
import Admin from '../lib/models/Admin';
import Applicant from '../lib/models/Applicant';
import AuditLog from '../lib/models/AuditLog';
import PaymentSettings from '../lib/models/PaymentSettings';
import DuesPayment from '../lib/models/DuesPayment';
import DuesCheckout from '../lib/models/DuesCheckout';
import WelfareFund from '../lib/models/WelfareFund';
import WelfarePayment from '../lib/models/WelfarePayment';
import WelfareCheckout from '../lib/models/WelfareCheckout';
import { paymentCorrectionSchema, welfareRequestSchema, welfareFundSchema } from '../lib/payments/policy';
import { HIDDEN_ACCOUNT_EMAIL, visibleAccountFilter } from '../lib/utils/account-visibility';

const memberId = new mongoose.Types.ObjectId(), invoiceId = new mongoose.Types.ObjectId(), fundId = new mongoose.Types.ObjectId();
const email = 'member@example.org';
const reference = `WELFARE-${invoiceId}-0123456789abcdef`;
const checkoutData = { invoiceId, memberId, reference, email, amountKobo: 350_000 };
const transaction = { reference, status: 'success', amount: 350_000, currency: 'NGN', customer: { email }, paid_at: '2026-10-01T10:00:00Z' };

function isolatedConnection() {
  process.env.MONGODB_URI ||= 'mongodb://127.0.0.1/unused_finance_test_database';
  global.mongoose ||= { conn: null, promise: null };
  global.mongoose.conn = mongoose; global.mongoose.promise = null;
}
function fixtureInvoice(status: 'Unpaid' | 'Pending' | 'Paid' = 'Unpaid') {
  return new WelfarePayment({ _id: invoiceId, memberId, fundId, amountKobo: 350_000, status });
}
function mockMember(t: TestContext) {
  const member = new Member({ _id: memberId, email, password: 'test-password', emailVerified: true, createdAt: new Date('2025-01-01'), fullName: 'Test Member' });
  t.mock.method(Member, 'findOne', (filter: unknown) => {
    assert.equal((filter as { email: { $ne: string } }).email.$ne, HIDDEN_ACCOUNT_EMAIL);
    return Promise.resolve(member) as unknown as ReturnType<typeof Member.findOne>;
  });
  return member;
}
async function mockAdmin(t: TestContext, role: 'Super Admin' | 'Verifier' = 'Super Admin') {
  isolatedConnection(); const { createToken } = await import('../lib/utils/auth');
  const admin = new Admin({ email: 'reviewer@example.org', fullName: 'Reviewer', password: 'hash', role, isActive: true });
  const token = await createToken({ adminId: admin._id.toString(), email: admin.email, role });
  const headers = createRequire(resolve('package.json'))('next/headers') as typeof import('next/headers');
  t.mock.method(headers, 'cookies', () => Promise.resolve({ get: (name: string) => name === 'admin-token' ? { value: token } : undefined }) as unknown as ReturnType<typeof headers.cookies>);
  t.mock.method(Admin, 'findById', () => ({ select: () => Promise.resolve(admin) }) as unknown as ReturnType<typeof Admin.findById>);
  t.mock.method(AuditLog, 'create', () => Promise.resolve({}) as unknown as ReturnType<typeof AuditLog.create>);
  return admin;
}
function request(path: string, method: string, data: unknown) {
  return new NextRequest(`http://localhost${path}`, { method, body: JSON.stringify(data) });
}
function env(t: TestContext, key: string, value: string) { const prior = process.env[key]; process.env[key] = value; t.after(() => { if (prior === undefined) delete process.env[key]; else process.env[key] = prior; }); }

test('welfare claims accept only server-priced checkout or a real transfer claim', () => {
  assert.equal(welfareRequestSchema.safeParse({ fundId: fundId.toString(), method: 'paystack' }).success, true);
  assert.equal(welfareRequestSchema.safeParse({ fundId: fundId.toString(), method: 'paystack', amountKobo: 1 }).success, false);
  assert.equal(welfareRequestSchema.safeParse({ fundId: fundId.toString(), method: 'bank', bankReference: 'REF001', senderName: 'Member', transferDate: '2026-02-30' }).success, false);
  assert.equal(welfareRequestSchema.safeParse({ fundId: fundId.toString(), method: 'bank', bankReference: 'REF001', senderName: 'Member', transferDate: '2026-01-01', status: 'Paid' }).success, false);
  assert.equal(welfareFundSchema.safeParse({ title: 'Welfare fund', amountKobo: 100.5 }).success, false);
});
test('payment corrections require an explanation and cannot invent a payment method or owner', () => {
  assert.equal(paymentCorrectionSchema.safeParse({ operation: 'correct', status: 'Unpaid', note: 'Corrected receipt' }).success, true);
  for (const payload of [{ operation: 'correct', status: 'Paid', note: '' }, { operation: 'correct', status: 'Paid', note: 'Reason', memberId: memberId.toString() }, { operation: 'correct', status: 'Paid', note: 'Reason', paymentMethod: 'paystack' }]) assert.equal(paymentCorrectionSchema.safeParse(payload).success, false);
});
test('welfare invoices have one contribution per fund/member and unique bank references', () => {
  assert.ok(WelfarePayment.schema.indexes().some(([keys, options]) => keys.memberId === 1 && keys.fundId === 1 && options.unique));
  assert.ok(WelfarePayment.schema.indexes().some(([keys, options]) => keys.bankReference === 1 && options.unique));
  assert.equal(WelfareFund.schema.path('amountKobo').options.min, 1);
});
test('new dues invoices capture the configured price instead of the default', async t => {
  isolatedConnection(); const { ensureInvoice } = await import('../lib/payments/server');
  t.mock.method(PaymentSettings, 'findOne', () => ({ lean: () => Promise.resolve({ quarterlyDuesKobo: 425_000 }) }) as unknown as ReturnType<typeof PaymentSettings.findOne>);
  t.mock.method(DuesPayment, 'init', () => Promise.resolve(DuesPayment) as unknown as ReturnType<typeof DuesPayment.init>);
  t.mock.method(DuesPayment, 'findOneAndUpdate', (_filter: unknown, update: unknown) => {
    assert.deepEqual(update, { $setOnInsert: { amountKobo: 425_000, status: 'Unpaid' } });
    return Promise.resolve(new DuesPayment({ memberId, year: 2026, quarter: 4, amountKobo: 425_000 })) as unknown as ReturnType<typeof DuesPayment.findOneAndUpdate>;
  });
  assert.equal((await ensureInvoice(memberId.toString(), 2026, 4)).amountKobo, 425_000);
});
test('settings default to NGN2000 when an administrator has not configured a price', async t => {
  isolatedConnection(); const { paymentSettings } = await import('../lib/payments/settings');
  t.mock.method(PaymentSettings, 'findOne', () => ({ lean: () => Promise.resolve(null) }) as unknown as ReturnType<typeof PaymentSettings.findOne>);
  assert.deepEqual(await paymentSettings(), { quarterlyDuesKobo: 200_000 });
});
test('welfare checkout captures its invoice amount and binds the verified owner without real Paystack requests', async t => {
  isolatedConnection(); env(t, 'PAYSTACK_SECRET_KEY', 'isolated-key'); env(t, 'NEXT_PUBLIC_APP_URL', 'https://portal.example.org');
  const { initialiseWelfareCheckout } = await import('../lib/payments/welfare');
  t.mock.method(WelfareCheckout, 'init', () => Promise.resolve(WelfareCheckout) as unknown as ReturnType<typeof WelfareCheckout.init>);
  t.mock.method(WelfareCheckout, 'create', (value: unknown) => Promise.resolve(new WelfareCheckout(value)) as unknown as ReturnType<typeof WelfareCheckout.create>);
  t.mock.method(globalThis, 'fetch', async (url: unknown, options?: RequestInit) => {
    assert.equal(url, 'https://api.paystack.co/transaction/initialize');
    const body = JSON.parse(String(options?.body));
    assert.equal(body.amount, 350_000); assert.equal(body.email, email); assert.equal(body.currency, 'NGN');
    assert.equal(body.callback_url, 'https://portal.example.org/members/payments/callback'); assert.equal(body.metadata.paymentType, 'welfare');
    return new Response(JSON.stringify({ status: true, data: { authorization_url: 'https://checkout.paystack.com/isolated' } }));
  });
  assert.match((await initialiseWelfareCheckout(fixtureInvoice(), email)).reference, /^WELFARE-[a-f\d]{24}-[a-f\d]{16}$/);
});
test('welfare Paystack callback/webhook replay confirms once and preserves the stored receipt', async t => {
  isolatedConnection(); const { confirmWelfareTransaction } = await import('../lib/payments/welfare');
  const invoice = fixtureInvoice(), checkout = new WelfareCheckout(checkoutData); let writes = 0;
  t.mock.method(WelfareCheckout, 'findOne', () => Promise.resolve(checkout) as unknown as ReturnType<typeof WelfareCheckout.findOne>);
  t.mock.method(WelfarePayment, 'findOneAndUpdate', (filter: unknown, update: unknown) => {
    assert.deepEqual(filter, { _id: invoiceId, status: { $ne: 'Paid' } });
    if (invoice.status === 'Paid') return Promise.resolve(null) as unknown as ReturnType<typeof WelfarePayment.findOneAndUpdate>;
    Object.assign(invoice, (update as { $set: object }).$set); writes++;
    return Promise.resolve(invoice) as unknown as ReturnType<typeof WelfarePayment.findOneAndUpdate>;
  });
  t.mock.method(WelfarePayment, 'findById', () => Promise.resolve(invoice) as unknown as ReturnType<typeof WelfarePayment.findById>);
  t.mock.method(WelfareCheckout, 'updateOne', () => Promise.resolve({}) as unknown as ReturnType<typeof WelfareCheckout.updateOne>);
  assert.equal((await confirmWelfareTransaction(transaction, memberId.toString())).changed, true);
  assert.equal((await confirmWelfareTransaction(transaction)).changed, false); assert.equal(writes, 1); assert.equal(invoice.paymentRef, reference);
});
test('welfare rejects cross-account, wrong amount/currency and voided checkout confirmation', async t => {
  isolatedConnection(); const { confirmWelfareTransaction } = await import('../lib/payments/welfare');
  const checkout = new WelfareCheckout(checkoutData);
  t.mock.method(WelfareCheckout, 'findOne', () => Promise.resolve(checkout) as unknown as ReturnType<typeof WelfareCheckout.findOne>);
  const update = t.mock.method(WelfarePayment, 'findOneAndUpdate', () => { throw new Error('Invalid receipt must not change payment'); });
  await assert.rejects(confirmWelfareTransaction(transaction, new mongoose.Types.ObjectId().toString()), /not found/);
  for (const candidate of [{ ...transaction, amount: 1 }, { ...transaction, currency: 'USD' }, { ...transaction, customer: { email: 'other@example.org' } }]) await assert.rejects(confirmWelfareTransaction(candidate), /did not match/);
  checkout.status = 'Voided'; await assert.rejects(confirmWelfareTransaction(transaction), /voided/); assert.equal(update.mock.callCount(), 0);
});
test('second welfare receipts are flagged for review without replacing the original payment', async t => {
  isolatedConnection(); const { confirmWelfareTransaction } = await import('../lib/payments/welfare');
  const invoice = fixtureInvoice('Paid'); invoice.paymentRef = 'FIRST';
  t.mock.method(WelfareCheckout, 'findOne', () => Promise.resolve(new WelfareCheckout(checkoutData)) as unknown as ReturnType<typeof WelfareCheckout.findOne>);
  t.mock.method(WelfarePayment, 'findOneAndUpdate', () => Promise.resolve(null) as unknown as ReturnType<typeof WelfarePayment.findOneAndUpdate>);
  t.mock.method(WelfarePayment, 'findById', () => Promise.resolve(invoice) as unknown as ReturnType<typeof WelfarePayment.findById>);
  t.mock.method(WelfareCheckout, 'updateOne', (_filter: unknown, update: unknown) => { assert.equal((update as { $set: { status: string } }).$set.status, 'Duplicate'); return Promise.resolve({}) as unknown as ReturnType<typeof WelfareCheckout.updateOne>; });
  assert.equal((await confirmWelfareTransaction(transaction)).duplicate, true); assert.equal(invoice.paymentRef, 'FIRST');
});
test('welfare directory includes never-paid members and counts only confirmed contributions', async () => {
  isolatedConnection(); const { welfarePaymentDirectory } = await import('../lib/payments/welfare');
  const people = [{ id: memberId.toString(), fullName: 'Member', email: 'private@example.org' }, { id: 'another', fullName: 'Never paid' }];
  const invoices = [{ memberId: people[0].id, fundId: fundId.toString(), amountKobo: 350_000, status: 'Paid', bankReference: 'SECRET' }, { memberId: people[0].id, fundId: 'other', amountKobo: 200_000, status: 'Pending' }];
  const rows = welfarePaymentDirectory(people, invoices, fundId.toString(), 400_000);
  assert.equal(rows[0].welfarePaymentCount, 1); assert.equal(rows[0].totalAmountKobo, 350_000); assert.equal(rows[1].status, 'Unpaid');
  assert.equal(rows[1].amountKobo, 400_000); assert.equal('email' in rows[0], false); assert.equal('bankReference' in rows[0], false);
});
test('bank welfare review is atomic and repeating confirmation is rejected', async t => {
  await mockAdmin(t); mockMember(t); const { PATCH } = await import('../app/api/admin/welfare-payments/[id]/route');
  const invoice = fixtureInvoice('Pending'); invoice.paymentMethod = 'bank'; invoice.bankReference = 'TRANSFER001';
  t.mock.method(WelfarePayment, 'findById', () => Promise.resolve(invoice) as unknown as ReturnType<typeof WelfarePayment.findById>);
  t.mock.method(WelfarePayment, 'findOneAndUpdate', (filter: unknown, update: unknown) => {
    assert.deepEqual(filter, { _id: invoiceId.toString(), status: 'Pending', paymentMethod: 'bank' });
    if (invoice.status !== 'Pending') return Promise.resolve(null) as unknown as ReturnType<typeof WelfarePayment.findOneAndUpdate>;
    Object.assign(invoice, (update as { $set: object }).$set); return Promise.resolve(invoice) as unknown as ReturnType<typeof WelfarePayment.findOneAndUpdate>;
  });
  const call = () => PATCH(request(`/api/admin/welfare-payments/${invoiceId}`, 'PATCH', { decision: 'approve', note: 'Matched statement' }), { params: Promise.resolve({ id: invoiceId.toString() }) });
  assert.equal((await call()).status, 200); assert.equal(invoice.status, 'Paid'); assert.equal((await call()).status, 409);
});
test('manual corrections void old checkout receipts and record a required reason', async t => {
  isolatedConnection(); mockMember(t); const { correctPayment } = await import('../lib/payments/admin');
  const invoice = fixtureInvoice('Paid'); invoice.paymentRef = reference;
  t.mock.method(WelfarePayment, 'findById', () => Promise.resolve(invoice) as unknown as ReturnType<typeof WelfarePayment.findById>);
  let voided = false;
  t.mock.method(WelfareCheckout, 'updateMany', (_filter: unknown, update: unknown) => { assert.deepEqual(update, { $set: { status: 'Voided' } }); voided = true; return Promise.resolve({}) as unknown as ReturnType<typeof WelfareCheckout.updateMany>; });
  t.mock.method(WelfarePayment, 'findOneAndUpdate', (_filter: unknown, update: unknown) => { assert.equal(voided, true); const value = update as { $set: { status: string; adminNote: string }; $unset: object }; assert.equal(value.$set.status, 'Unpaid'); assert.equal(value.$set.adminNote, 'Incorrectly allocated'); assert.deepEqual(value.$unset, { paidAt: 1, paymentRef: 1 }); return Promise.resolve(fixtureInvoice()) as unknown as ReturnType<typeof WelfarePayment.findOneAndUpdate>; });
  assert.equal((await correctPayment(WelfarePayment, WelfareCheckout, invoiceId.toString(), new mongoose.Types.ObjectId(), { operation: 'correct', status: 'Unpaid', note: 'Incorrectly allocated' })).payment.status, 'Unpaid');
});
test('administrators cannot edit a hidden or deleted member payment record', async t => {
  isolatedConnection(); const { correctPayment } = await import('../lib/payments/admin');
  t.mock.method(WelfarePayment, 'findById', () => Promise.resolve(fixtureInvoice()) as unknown as ReturnType<typeof WelfarePayment.findById>);
  t.mock.method(Member, 'findOne', (filter: unknown) => { assert.deepEqual((filter as object), { _id: memberId, emailVerified: true, ...visibleAccountFilter }); return Promise.resolve(null) as unknown as ReturnType<typeof Member.findOne>; });
  const update = t.mock.method(WelfareCheckout, 'updateMany', () => { throw new Error('Hidden account must not be mutated'); });
  await assert.rejects(correctPayment(WelfarePayment, WelfareCheckout, invoiceId.toString(), new mongoose.Types.ObjectId(), { operation: 'correct', status: 'Paid', note: 'Manual correction', bankReference: 'REF001' }), /Member not found/); assert.equal(update.mock.callCount(), 0);
});
test('Verifier accounts cannot change prices, funds or welfare confirmations', async t => {
  await mockAdmin(t, 'Verifier'); const settings = await import('../app/api/admin/payment-settings/route'); const funds = await import('../app/api/admin/welfare-payments/route'); const review = await import('../app/api/admin/welfare-payments/[id]/route');
  assert.equal((await settings.PATCH(request('/api/admin/payment-settings', 'PATCH', { quarterlyDuesKobo: 100_000, note: 'Price change' }))).status, 403);
  assert.equal((await funds.POST(request('/api/admin/welfare-payments', 'POST', { title: 'Fund', amountKobo: 100_000 }))).status, 403);
  assert.equal((await review.PATCH(request(`/api/admin/welfare-payments/${invoiceId}`, 'PATCH', { decision: 'approve' }), { params: Promise.resolve({ id: invoiceId.toString() }) })).status, 403);
});
test('anonymous users cannot read or submit welfare payments', async t => {
  isolatedConnection(); const headers = createRequire(resolve('package.json'))('next/headers') as typeof import('next/headers');
  t.mock.method(headers, 'cookies', () => Promise.resolve({ get: () => undefined }) as unknown as ReturnType<typeof headers.cookies>);
  const route = await import('../app/api/member/welfare-payments/route');
  assert.equal((await route.GET()).status, 401); assert.equal((await route.POST(request('/api/member/welfare-payments', 'POST', { fundId: fundId.toString(), method: 'paystack' }))).status, 401);
});
test('the verified member lookup excludes the invisible account before loading payment directories', async t => {
  isolatedConnection(); const { visiblePaymentMembers } = await import('../lib/payments/people');
  t.mock.method(Member, 'find', (filter: unknown) => { assert.deepEqual(filter, { emailVerified: true, ...visibleAccountFilter }); return { select: () => ({ lean: () => Promise.resolve([{ _id: memberId, email, fullName: 'Visible Member', createdAt: new Date('2025-01-01') }]) }) } as unknown as ReturnType<typeof Member.find>; });
  t.mock.method(Applicant, 'find', (filter: unknown) => { assert.equal((filter as { email: { $ne: string } }).email.$ne, HIDDEN_ACCOUNT_EMAIL); return { select: () => ({ lean: () => Promise.resolve([]) }) } as unknown as ReturnType<typeof Applicant.find>; });
  const rows = await visiblePaymentMembers(); assert.equal(rows.length, 1); assert.equal(rows[0].fullName, 'Visible Member');
});
test('the signed Paystack webhook dispatches welfare receipts to automatic confirmation', async t => {
  isolatedConnection(); env(t, 'PAYSTACK_SECRET_KEY', 'isolated-webhook-key'); const { POST } = await import('../app/api/payment/webhook/route');
  t.mock.method(WelfareCheckout, 'findOne', () => Promise.resolve(new WelfareCheckout(checkoutData)) as unknown as ReturnType<typeof WelfareCheckout.findOne>);
  const invoice = fixtureInvoice('Paid'); invoice.paymentRef = reference;
  t.mock.method(WelfarePayment, 'findOneAndUpdate', () => Promise.resolve(null) as unknown as ReturnType<typeof WelfarePayment.findOneAndUpdate>);
  t.mock.method(WelfarePayment, 'findById', () => Promise.resolve(invoice) as unknown as ReturnType<typeof WelfarePayment.findById>);
  t.mock.method(WelfareCheckout, 'updateOne', () => Promise.resolve({}) as unknown as ReturnType<typeof WelfareCheckout.updateOne>);
  const raw = JSON.stringify({ event: 'charge.success', data: transaction }); const signature = createHmac('sha512', 'isolated-webhook-key').update(raw).digest('hex');
  assert.equal((await POST(new NextRequest('http://localhost/api/payment/webhook', { method: 'POST', headers: { 'x-paystack-signature': signature }, body: raw }))).status, 200);
});
