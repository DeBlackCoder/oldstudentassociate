import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import DuesPayment from '../lib/models/DuesPayment';
import DuesCheckout from '../lib/models/DuesCheckout';
import PaymentSettings from '../lib/models/PaymentSettings';
import Applicant from '../lib/models/Applicant';
import Member from '../lib/models/Member';
import Admin from '../lib/models/Admin';
import AuditLog from '../lib/models/AuditLog';
import Notification from '../lib/models/Notification';
import Event from '../lib/models/Event';
import EventRegistration from '../lib/models/EventRegistration';
import { currentPeriod, eligibleQuarters, validDuesTransaction, duesRequestSchema, bankReviewSchema, QUARTERLY_DUES_KOBO, type PaystackTransaction } from '../lib/payments/policy';
import { paymentDirectory, welfareDirectory, type DirectoryMember } from '../lib/payments/directory';
import { createMemberToken } from '../lib/utils/member-auth';

const memberId = new mongoose.Types.ObjectId();
const otherMemberId = new mongoose.Types.ObjectId();
const invoiceId = new mongoose.Types.ObjectId();
const reference = `DUES-${invoiceId}-0123456789abcdef`;
const checkoutData = { invoiceId, memberId, reference, email: 'member@example.org', amountKobo: QUARTERLY_DUES_KOBO };
const transaction: PaystackTransaction = { reference, status: 'success', currency: 'NGN', amount: QUARTERLY_DUES_KOBO, customer: { email: 'MEMBER@example.org' }, paid_at: '2026-10-01T10:00:00Z' };
const now = new Date('2026-10-07T12:00:00Z');
const people: DirectoryMember[] = [
  { id: memberId.toString(), fullName: 'Alex Member', membershipNumber: 'RSSS/001', secondarySchool: 'Test School', createdAt: new Date('2025-01-01'), registrationPaid: true },
  { id: otherMemberId.toString(), fullName: 'New Member', createdAt: new Date('2026-10-01'), registrationPaid: false },
];

function isolatedConnection() {
  // All model calls are mocked. This prevents any configured MongoDB connection.
  process.env.MONGODB_URI ||= 'mongodb://127.0.0.1/unused_payment_test_database';
  global.mongoose ||= { conn: null, promise: null };
  global.mongoose.conn = mongoose;
  global.mongoose.promise = null;
}
async function paymentServer() {
  isolatedConnection();
  return import('../lib/payments/server');
}
function temporaryEnv(t: TestContext, name: string, value?: string) {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name]; else process.env[name] = value;
  t.after(() => { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; });
}
function fixtureInvoice(status: 'Unpaid' | 'Pending' | 'Paid' = 'Unpaid') {
  return new DuesPayment({ _id: invoiceId, memberId, year: 2026, quarter: 4, amountKobo: QUARTERLY_DUES_KOBO, status });
}
async function mockAdminSession(t: TestContext, role: 'Super Admin' | 'Verifier') {
  isolatedConnection();
  const { createToken } = await import('../lib/utils/auth');
  const admin = new Admin({ email: 'administrator@example.org', fullName: 'Payment Reviewer', password: 'unused-hash', role, isActive: true });
  const token = await createToken({ adminId: admin._id.toString(), email: admin.email, role });
  const headersModule = createRequire(resolve('package.json'))('next/headers') as typeof import('next/headers');
  t.mock.method(headersModule, 'cookies', () => Promise.resolve({ get: (name: string) => name === 'admin-token' ? { name, value: token } : undefined }) as unknown as ReturnType<typeof headersModule.cookies>);
  t.mock.method(Admin, 'findById', () => ({ select: () => Promise.resolve(admin) }) as unknown as ReturnType<typeof Admin.findById>);
  return admin;
}

test('quarter boundaries follow Nigeria time, including the year rollover', () => {
  assert.deepEqual(currentPeriod(new Date('2026-03-31T22:59:59Z')), { year: 2026, quarter: 1 });
  assert.deepEqual(currentPeriod(new Date('2026-03-31T23:00:00Z')), { year: 2026, quarter: 2 });
  assert.deepEqual(currentPeriod(new Date('2026-12-31T23:00:00Z')), { year: 2027, quarter: 1 });
});
test('dues begin in the joining quarter, never before programme inception or in a future quarter', () => {
  assert.deepEqual(eligibleQuarters(2026, new Date('2025-02-01'), now), [1, 2, 3, 4]);
  assert.deepEqual(eligibleQuarters(2026, new Date('2026-08-02'), now), [3, 4]);
  assert.deepEqual(eligibleQuarters(2025, new Date('2024-01-01'), now), []);
  assert.deepEqual(eligibleQuarters(2027, new Date('2024-01-01'), now), []);
  assert.deepEqual(eligibleQuarters(2026, new Date('2026-11-01'), new Date('2026-08-01')), []);
  assert.deepEqual(eligibleQuarters(2027, new Date('2026-08-01'), new Date('2028-01-01')), [1, 2, 3, 4]);
});
test('Paystack confirmation requires the stored reference, exact kobo amount, NGN and the payer', () => {
  assert.equal(validDuesTransaction(transaction, checkoutData), true);
  const invalid: PaystackTransaction[] = [
    { ...transaction, reference: `${reference}-wrong` },
    { ...transaction, status: 'pending' },
    { ...transaction, amount: QUARTERLY_DUES_KOBO - 1 },
    { ...transaction, amount: QUARTERLY_DUES_KOBO + 1 },
    { ...transaction, currency: 'USD' },
    { ...transaction, customer: { email: 'other@example.org' } },
    { ...transaction, customer: undefined },
  ];
  for (const candidate of invalid) assert.equal(validDuesTransaction(candidate, checkoutData), false);
});
test('transfer claims validate real calendar dates and cannot set their own paid status', () => {
  const input = { method: 'bank', year: 2026, quarter: 1, bankReference: 'TRANSFER-001', senderName: 'Alex Member', transferDate: '2026-01-01' };
  assert.equal(duesRequestSchema.safeParse(input).success, true);
  assert.equal(duesRequestSchema.safeParse({ ...input, transferDate: '2026-02-30' }).success, false);
  assert.equal(duesRequestSchema.safeParse({ ...input, transferDate: '2099-01-01' }).success, false);
  assert.equal(duesRequestSchema.safeParse({ ...input, quarter: 5 }).success, false);
  assert.equal(duesRequestSchema.safeParse({ ...input, status: 'Paid' }).success, false);
  assert.equal(duesRequestSchema.safeParse({ method: 'paystack', year: 2026, quarter: 1, amount: 1 }).success, false);
});
test('manual bank rejection requires feedback and the review payload cannot rewrite payment details', () => {
  assert.equal(bankReviewSchema.safeParse({ decision: 'approve' }).success, true);
  assert.equal(bankReviewSchema.safeParse({ decision: 'reject', note: '' }).success, false);
  assert.equal(bankReviewSchema.safeParse({ decision: 'reject', note: 'Transfer not received' }).success, true);
  assert.equal(bankReviewSchema.safeParse({ decision: 'approve', amountKobo: 1 }).success, false);
});
test('only a pending bank claim can be manually confirmed and a repeated approval is rejected', async t => {
  await mockAdminSession(t, 'Super Admin');
  const { PATCH } = await import('../app/api/admin/dues/[id]/route');
  const invoice = fixtureInvoice('Pending'); invoice.paymentMethod = 'bank'; invoice.bankReference = 'TRANSFER-001';
  t.mock.method(DuesPayment, 'findById', () => Promise.resolve(invoice) as unknown as ReturnType<typeof DuesPayment.findById>);
  t.mock.method(Member, 'findOne', () => Promise.resolve(new Member({ _id: memberId, email: checkoutData.email, password: 'unused-password', emailVerified: true })) as unknown as ReturnType<typeof Member.findOne>);
  t.mock.method(DuesPayment, 'findOneAndUpdate', (filter: unknown, update: unknown) => {
    assert.deepEqual(filter, { _id: invoiceId.toString(), status: 'Pending', paymentMethod: 'bank' });
    if (invoice.status !== 'Pending' || invoice.paymentMethod !== 'bank') return Promise.resolve(null) as unknown as ReturnType<typeof DuesPayment.findOneAndUpdate>;
    Object.assign(invoice, (update as { $set: Record<string, unknown> }).$set);
    return Promise.resolve(invoice) as unknown as ReturnType<typeof DuesPayment.findOneAndUpdate>;
  });
  const audit = t.mock.method(AuditLog, 'create', () => Promise.resolve({}) as unknown as ReturnType<typeof AuditLog.create>);
  const request = () => new NextRequest(`http://localhost/api/admin/dues/${invoiceId}`, { method: 'PATCH', body: JSON.stringify({ decision: 'approve', note: 'Matched the bank statement' }) });
  const context = { params: Promise.resolve({ id: invoiceId.toString() }) };
  assert.equal((await PATCH(request(), context)).status, 200);
  assert.equal(invoice.status, 'Paid'); assert.ok(invoice.paidAt); assert.ok(invoice.reviewedBy);
  assert.equal((await PATCH(request(), context)).status, 409); assert.equal(audit.mock.callCount(), 1);
});
test('Verifier accounts cannot approve bank claims', async t => {
  await mockAdminSession(t, 'Verifier');
  const { PATCH } = await import('../app/api/admin/dues/[id]/route');
  const update = t.mock.method(DuesPayment, 'findOneAndUpdate', () => { throw new Error('Verifier must not change dues'); });
  const request = new NextRequest(`http://localhost/api/admin/dues/${invoiceId}`, { method: 'PATCH', body: JSON.stringify({ decision: 'approve' }) });
  assert.equal((await PATCH(request, { params: Promise.resolve({ id: invoiceId.toString() }) })).status, 403);
  assert.equal(update.mock.callCount(), 0);
});
test('anonymous visitors cannot read the member payment directory', async t => {
  isolatedConnection();
  const headersModule = createRequire(resolve('package.json'))('next/headers') as typeof import('next/headers');
  t.mock.method(headersModule, 'cookies', () => Promise.resolve({ get: () => undefined }) as unknown as ReturnType<typeof headersModule.cookies>);
  const { GET } = await import('../app/api/member/dues/route');
  const lookup = t.mock.method(DuesPayment, 'find', () => { throw new Error('Anonymous request must not load dues'); });
  assert.equal((await GET(new NextRequest('http://localhost/api/member/dues'))).status, 401);
  assert.equal(lookup.mock.callCount(), 0);
});
test('member directory counts lifetime registration, dues and event payments separately', () => {
  const invoices = [
    { memberId: people[0].id, year: 2025, quarter: 4, status: 'Paid' },
    { memberId: people[0].id, year: 2026, quarter: 1, status: 'Paid' },
    { memberId: people[0].id, year: 2026, quarter: 2, status: 'Paid' },
    { memberId: people[0].id, year: 2026, quarter: 3, status: 'Pending' },
    { memberId: people[0].id, year: 2026, quarter: 4, status: 'Rejected' },
  ];
  const result = paymentDirectory(people, invoices, [{ memberId: people[0].id }, { memberId: people[0].id }], 2026, now);
  assert.deepEqual(result[0].paidQuarters, [1, 2]);
  assert.equal(result[0].duesPaymentCount, 3);
  assert.equal(result[0].registrationPaymentCount, 1);
  assert.equal(result[0].eventPaymentCount, 2);
  assert.equal(result[0].totalPaymentCount, 6);
  assert.equal(result[0].status, 'Pending');
  assert.deepEqual(result[1].dueQuarters, [4]);
  assert.equal(result[1].status, 'Unpaid');
  assert.equal(result[1].totalPaymentCount, 0);
});
test('a member who has paid every eligible quarter is paid, while a not-yet-joined period is explicitly marked not due', () => {
  const result = paymentDirectory(people, [{ memberId: people[1].id, year: 2026, quarter: 4, status: 'Paid' }], [], 2026, now);
  assert.equal(result[1].status, 'Paid');
  assert.equal(paymentDirectory(people, [], [], 2026, new Date('2026-08-01'))[1].notYetDue, true);
});
test('the shared payment directory never leaks extra profile or transfer fields', () => {
  const privateMember = { ...people[0], email: 'private@example.org', password: 'secret-hash', residentialAddress: 'Private address' };
  const privateInvoice = { memberId: people[0].id, year: 2026, quarter: 1, status: 'Paid', bankReference: 'PRIVATE-REFERENCE', senderName: 'Private Sender', adminNote: 'Private review' };
  const row = paymentDirectory([privateMember], [privateInvoice], [], 2026, now)[0];
  assert.equal(row.fullName, people[0].fullName);
  for (const key of ['email', 'password', 'residentialAddress', 'bankReference', 'senderName', 'adminNote', 'createdAt']) assert.equal(key in row, false, key);
});
test('welfare aggregates repeated contributions by normalised name and keeps beneficiaries separate', () => {
  const records = [
    { donors: [{ name: ' ALEX   MEMBER ', amount: 1000, purpose: 'Support' }], beneficiaries: [{ name: 'New Member', amount: 500, purpose: 'Relief' }] },
    { donors: [{ name: 'Alex Member', amount: 2000, purpose: 'Support again' }, { name: 'External Donor', amount: 750, purpose: 'Gift' }], beneficiaries: [] },
  ];
  const directory = welfareDirectory(people, records);
  const member = directory.find(row => row.id === people[0].id)!;
  assert.equal(member.contributionCount, 2); assert.equal(member.totalAmount, 3000); assert.equal(member.benefitCount, 0);
  assert.equal(directory.find(row => row.id === people[1].id)?.benefitCount, 1);
  assert.equal(directory.find(row => row.fullName === 'External Donor')?.isMember, false);
});
test('ambiguous welfare names cannot credit the wrong member, and a membership number resolves the identity', () => {
  const duplicate = { ...people[1], fullName: people[0].fullName, membershipNumber: 'RSSS/002' };
  const directory = welfareDirectory([people[0], duplicate], [{ donors: [
    { name: 'Alex Member', amount: 100, purpose: 'Ambiguous name' },
    { name: 'Alex Member', membershipNumber: 'RSSS/002', amount: 200, purpose: 'Confirmed member' },
    { name: 'Alex Member', membershipNumber: 'UNKNOWN', amount: 300, purpose: 'Unmatched number' },
  ], beneficiaries: [] }]);
  assert.equal(directory.find(row => row.id === people[0].id)?.contributionCount, 0);
  assert.equal(directory.find(row => row.id === duplicate.id)?.totalAmount, 200);
  assert.equal(directory.filter(row => !row.isMember).length, 2);
});
test('the unique dues-period index prevents invoice duplication and invoice creation preserves prior payments', async t => {
  const { ensureInvoice } = await paymentServer();
  const invoice = fixtureInvoice('Paid');
  t.mock.method(DuesPayment, 'init', () => Promise.resolve(DuesPayment) as unknown as ReturnType<typeof DuesPayment.init>);
  let captured: unknown[] = [];
  t.mock.method(DuesPayment, 'findOneAndUpdate', (...args: unknown[]) => { captured = args; return Promise.resolve(invoice) as unknown as ReturnType<typeof DuesPayment.findOneAndUpdate>; });
  assert.equal(await ensureInvoice(memberId.toString(), 2026, 4), invoice);
  assert.deepEqual(captured[0], { memberId: memberId.toString(), year: 2026, quarter: 4 });
  assert.deepEqual(captured[1], { $setOnInsert: { amountKobo: QUARTERLY_DUES_KOBO, status: 'Unpaid' } });
  assert.ok(DuesPayment.schema.indexes().some(([keys, options]) => keys.memberId === 1 && keys.year === 1 && keys.quarter === 1 && options.unique));
  const transferIndex = DuesPayment.schema.indexes().find(([keys]) => keys.bankReference === 1);
  assert.equal(transferIndex?.[1].unique, true);
  assert.deepEqual(transferIndex?.[1].partialFilterExpression, { bankReference: { $type: 'string' } });
});
test('a concurrent invoice insert race reuses the unique existing period', async t => {
  const { ensureInvoice } = await paymentServer(); const invoice = fixtureInvoice();
  t.mock.method(PaymentSettings, 'findOne', () => ({ lean: () => Promise.resolve(null) }) as unknown as ReturnType<typeof PaymentSettings.findOne>);
  t.mock.method(DuesPayment, 'init', () => Promise.resolve(DuesPayment) as unknown as ReturnType<typeof DuesPayment.init>);
  t.mock.method(DuesPayment, 'findOneAndUpdate', () => Promise.reject(Object.assign(new Error('Duplicate invoice'), { code: 11000 })) as unknown as ReturnType<typeof DuesPayment.findOneAndUpdate>);
  t.mock.method(DuesPayment, 'findOne', () => Promise.resolve(invoice) as unknown as ReturnType<typeof DuesPayment.findOne>);
  assert.equal(await ensureInvoice(memberId.toString(), 2026, 4), invoice);
});
test('checkout initialization binds server-controlled amount, owner and callback without contacting Paystack', async t => {
  const { initialiseDuesCheckout } = await paymentServer();
  temporaryEnv(t, 'PAYSTACK_SECRET_KEY', 'isolated-paystack-test-key');
  temporaryEnv(t, 'NEXT_PUBLIC_APP_URL', 'https://portal.example.org/');
  t.mock.method(DuesCheckout, 'init', () => Promise.resolve(DuesCheckout) as unknown as ReturnType<typeof DuesCheckout.init>);
  t.mock.method(DuesCheckout, 'create', (value: unknown) => Promise.resolve(new DuesCheckout(value)) as unknown as ReturnType<typeof DuesCheckout.create>);
  let body: Record<string, unknown> = {};
  t.mock.method(globalThis, 'fetch', async (url: unknown, options?: RequestInit) => {
    assert.equal(url, 'https://api.paystack.co/transaction/initialize');
    body = JSON.parse(String(options?.body));
    return new Response(JSON.stringify({ status: true, data: { authorization_url: 'https://checkout.paystack.com/test' } }), { status: 200 });
  });
  const result = await initialiseDuesCheckout(fixtureInvoice(), checkoutData.email);
  assert.match(result.reference, /^DUES-[a-f\d]{24}-[a-f\d]{16}$/);
  assert.equal(body.amount, QUARTERLY_DUES_KOBO); assert.equal(body.currency, 'NGN');
  assert.equal(body.email, checkoutData.email); assert.equal(body.callback_url, 'https://portal.example.org/members/payments/callback');
  assert.deepEqual(body.metadata, { paymentType: 'dues', invoiceId: invoiceId.toString(), memberId: memberId.toString() });
});
test('an unconfigured Paystack integration fails before creating a checkout or sending a request', async t => {
  const { initialiseDuesCheckout } = await paymentServer();
  temporaryEnv(t, 'PAYSTACK_SECRET_KEY');
  const create = t.mock.method(DuesCheckout, 'create', () => { throw new Error('Should not create'); });
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Should not fetch'); });
  await assert.rejects(initialiseDuesCheckout(fixtureInvoice(), checkoutData.email), /not configured/);
  assert.equal(create.mock.callCount(), 0); assert.equal(fetch.mock.callCount(), 0);
});
test('replaying callback and webhook confirmation credits a quarter only once', async t => {
  const { confirmDuesTransaction } = await paymentServer();
  const checkout = new DuesCheckout(checkoutData), invoice = fixtureInvoice();
  t.mock.method(DuesCheckout, 'findOne', () => Promise.resolve(checkout) as unknown as ReturnType<typeof DuesCheckout.findOne>);
  let writes = 0;
  t.mock.method(DuesPayment, 'findOneAndUpdate', (filter: unknown, update: unknown) => {
    assert.deepEqual(filter, { _id: invoiceId, status: { $ne: 'Paid' } });
    if (invoice.status === 'Paid') return Promise.resolve(null) as unknown as ReturnType<typeof DuesPayment.findOneAndUpdate>;
    Object.assign(invoice, (update as { $set: Record<string, unknown> }).$set); writes++;
    return Promise.resolve(invoice) as unknown as ReturnType<typeof DuesPayment.findOneAndUpdate>;
  });
  t.mock.method(DuesPayment, 'findById', () => Promise.resolve(invoice) as unknown as ReturnType<typeof DuesPayment.findById>);
  const acknowledgements: unknown[] = [];
  t.mock.method(DuesCheckout, 'updateOne', (_filter: unknown, update: unknown) => { acknowledgements.push(update); return Promise.resolve({ acknowledged: true }) as unknown as ReturnType<typeof DuesCheckout.updateOne>; });
  assert.equal((await confirmDuesTransaction(transaction, memberId.toString())).duplicate, false);
  assert.equal((await confirmDuesTransaction(transaction)).duplicate, false);
  assert.equal(writes, 1); assert.equal(invoice.status, 'Paid'); assert.equal(invoice.paymentRef, reference);
  assert.ok(acknowledgements.every(update => (update as { $set: { status: string } }).$set.status === 'Paid'));
});
test('a second successful checkout for an already paid quarter is flagged without overwriting the original receipt', async t => {
  const { confirmDuesTransaction } = await paymentServer();
  const checkout = new DuesCheckout(checkoutData), invoice = fixtureInvoice('Paid'); invoice.paymentRef = 'FIRST-RECEIPT';
  t.mock.method(DuesCheckout, 'findOne', () => Promise.resolve(checkout) as unknown as ReturnType<typeof DuesCheckout.findOne>);
  t.mock.method(DuesPayment, 'findOneAndUpdate', () => Promise.resolve(null) as unknown as ReturnType<typeof DuesPayment.findOneAndUpdate>);
  t.mock.method(DuesPayment, 'findById', () => Promise.resolve(invoice) as unknown as ReturnType<typeof DuesPayment.findById>);
  let status = '';
  t.mock.method(DuesCheckout, 'updateOne', (_filter: unknown, update: unknown) => { status = (update as { $set: { status: string } }).$set.status; return Promise.resolve({ acknowledged: true }) as unknown as ReturnType<typeof DuesCheckout.updateOne>; });
  assert.equal((await confirmDuesTransaction(transaction)).duplicate, true);
  assert.equal(invoice.paymentRef, 'FIRST-RECEIPT'); assert.equal(status, 'Duplicate');
});
test('another account or a mismatched amount cannot change an invoice', async t => {
  const { confirmDuesTransaction } = await paymentServer();
  t.mock.method(DuesCheckout, 'findOne', () => Promise.resolve(new DuesCheckout(checkoutData)) as unknown as ReturnType<typeof DuesCheckout.findOne>);
  const update = t.mock.method(DuesPayment, 'findOneAndUpdate', () => { throw new Error('Must not update'); });
  await assert.rejects(confirmDuesTransaction(transaction, otherMemberId.toString()), /not found for your account/);
  await assert.rejects(confirmDuesTransaction({ ...transaction, amount: 1 }), /did not match/);
  assert.equal(update.mock.callCount(), 0);
});
test('missing invoices are not marked as confirmed checkout receipts', async t => {
  const { confirmDuesTransaction } = await paymentServer();
  t.mock.method(DuesCheckout, 'findOne', () => Promise.resolve(new DuesCheckout(checkoutData)) as unknown as ReturnType<typeof DuesCheckout.findOne>);
  t.mock.method(DuesPayment, 'findOneAndUpdate', () => Promise.resolve(null) as unknown as ReturnType<typeof DuesPayment.findOneAndUpdate>);
  t.mock.method(DuesPayment, 'findById', () => Promise.resolve(null) as unknown as ReturnType<typeof DuesPayment.findById>);
  const update = t.mock.method(DuesCheckout, 'updateOne', () => { throw new Error('Must not acknowledge'); });
  await assert.rejects(confirmDuesTransaction(transaction), /Dues period not found/); assert.equal(update.mock.callCount(), 0);
});
test('membership confirmation validates captured amount, email and original application reference', async t => {
  isolatedConnection(); const { confirmMembershipTransaction } = await import('../lib/payments/membership');
  const applicant = new Applicant({ applicationRef: 'RSSS/2026/001', email: checkoutData.email, paymentStatus: 'unpaid', paymentExpectedAmount: 300000 });
  t.mock.method(Applicant, 'findOne', () => Promise.resolve(applicant) as unknown as ReturnType<typeof Applicant.findOne>);
  const update = t.mock.method(Applicant, 'findOneAndUpdate', () => { throw new Error('Must not update an invalid payment'); });
  const membershipTransaction = { ...transaction, reference: 'RSSS-2026-001', amount: 300000 };
  for (const invalid of [{ ...membershipTransaction, amount: 200000 }, { ...membershipTransaction, currency: 'USD' }, { ...membershipTransaction, reference: 'RSSS-2026-002' }, { ...membershipTransaction, customer: { email: 'other@example.org' } }]) {
    await assert.rejects(confirmMembershipTransaction(invalid), /did not match/);
  }
  assert.equal(update.mock.callCount(), 0);
});
test('membership callbacks are idempotent and preserve the paid registration record', async t => {
  isolatedConnection(); const { confirmMembershipTransaction } = await import('../lib/payments/membership');
  const applicant = new Applicant({ applicationRef: 'RSSS/2026/001', email: checkoutData.email, paymentStatus: 'unpaid', paymentExpectedAmount: QUARTERLY_DUES_KOBO });
  t.mock.method(Applicant, 'findOne', () => Promise.resolve(applicant) as unknown as ReturnType<typeof Applicant.findOne>);
  let writes = 0;
  t.mock.method(Applicant, 'findOneAndUpdate', (filter: unknown, update: unknown) => {
    assert.deepEqual(filter, { _id: applicant._id, paymentStatus: { $ne: 'paid' } });
    if (applicant.paymentStatus === 'paid') return Promise.resolve(null) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
    Object.assign(applicant, (update as { $set: Record<string, unknown> }).$set); writes++;
    return Promise.resolve(applicant) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
  });
  const candidate = { ...transaction, reference: 'RSSS-2026-001' };
  assert.equal((await confirmMembershipTransaction(candidate)).changed, true);
  assert.equal((await confirmMembershipTransaction(candidate)).changed, false); assert.equal(writes, 1);
});
function webhookRequest(raw: string, secret: string, signature?: string) {
  return new NextRequest('http://localhost/api/payment/webhook', { method: 'POST', headers: { 'x-paystack-signature': signature || createHmac('sha512', secret).update(raw).digest('hex') }, body: raw });
}
test('webhook signatures are verified over the exact raw body before any payment lookup', async t => {
  isolatedConnection(); temporaryEnv(t, 'PAYSTACK_SECRET_KEY', 'isolated-webhook-test-key');
  const { POST } = await import('../app/api/payment/webhook/route');
  const lookup = t.mock.method(DuesCheckout, 'findOne', () => { throw new Error('Invalid signature must not reach storage'); });
  const raw = JSON.stringify({ event: 'charge.success', data: transaction });
  assert.equal((await POST(webhookRequest(raw, 'wrong-key'))).status, 401);
  assert.equal((await POST(webhookRequest(raw, 'isolated-webhook-test-key', 'invalid-signature'))).status, 401);
  assert.equal(lookup.mock.callCount(), 0);
});
test('a signed webhook confirms dues and requests retries on a transient storage failure', async t => {
  isolatedConnection(); temporaryEnv(t, 'PAYSTACK_SECRET_KEY', 'isolated-webhook-test-key');
  const { POST } = await import('../app/api/payment/webhook/route');
  const invoice = fixtureInvoice('Paid'); invoice.paymentRef = reference;
  t.mock.method(DuesCheckout, 'findOne', () => Promise.resolve(new DuesCheckout(checkoutData)) as unknown as ReturnType<typeof DuesCheckout.findOne>);
  t.mock.method(DuesPayment, 'findOneAndUpdate', () => Promise.resolve(invoice) as unknown as ReturnType<typeof DuesPayment.findOneAndUpdate>);
  t.mock.method(DuesCheckout, 'updateOne', () => Promise.resolve({ acknowledged: true }) as unknown as ReturnType<typeof DuesCheckout.updateOne>);
  const raw = JSON.stringify({ event: 'charge.success', data: transaction });
  const response = await POST(webhookRequest(raw, 'isolated-webhook-test-key'));
  assert.equal(response.status, 200); assert.equal((await response.json()).received, true);
  t.mock.method(DuesCheckout, 'findOne', () => Promise.reject(new Error('Temporary storage failure')) as unknown as ReturnType<typeof DuesCheckout.findOne>);
  t.mock.method(console, 'error', () => undefined);
  assert.equal((await POST(webhookRequest(raw, 'isolated-webhook-test-key'))).status, 500);
});
test('membership alerts are delivered once whether the webhook or browser callback confirms first', async t => {
  isolatedConnection(); temporaryEnv(t, 'PAYSTACK_SECRET_KEY', 'isolated-webhook-test-key');
  const member = new Member({ _id: memberId, email: checkoutData.email, password: 'unused-password', emailVerified: true, profileComplete: true });
  const token = await createMemberToken(member._id.toString(), member.email);
  const headersModule = createRequire(resolve('package.json'))('next/headers') as typeof import('next/headers');
  t.mock.method(headersModule, 'cookies', () => Promise.resolve({ get: (name: string) => name === 'member-token' ? { name, value: token } : undefined }) as unknown as ReturnType<typeof headersModule.cookies>);
  t.mock.method(Member, 'findById', () => Object.assign(Promise.resolve(member), { select: () => Promise.resolve(member) }) as unknown as ReturnType<typeof Member.findById>);
  const emails: unknown[] = [];
  t.mock.method(nodemailer, 'createTransport', () => ({ sendMail: async (message: unknown) => { emails.push(message); return { messageId: 'isolated-message' }; } }) as unknown as ReturnType<typeof nodemailer.createTransport>);
  const notification = t.mock.method(Notification, 'create', () => Promise.resolve({}) as unknown as ReturnType<typeof Notification.create>);
  const webhook = await import('../app/api/payment/webhook/route');
  const callback = await import('../app/api/payment/verify/route');
  let applicant = new Applicant();
  let candidate: PaystackTransaction = transaction;
  let writes = 0;
  t.mock.method(Applicant, 'findOne', () => Promise.resolve(applicant) as unknown as ReturnType<typeof Applicant.findOne>);
  t.mock.method(Applicant, 'findOneAndUpdate', (_filter: unknown, update: unknown) => {
    if (applicant.paymentStatus === 'paid') return Promise.resolve(null) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
    Object.assign(applicant, (update as { $set: Record<string, unknown> }).$set); writes++;
    return Promise.resolve(applicant) as unknown as ReturnType<typeof Applicant.findOneAndUpdate>;
  });
  t.mock.method(globalThis, 'fetch', async (url: unknown) => {
    assert.equal(url, `https://api.paystack.co/transaction/verify/${candidate.reference}`);
    return new Response(JSON.stringify({ status: true, data: candidate }), { status: 200 });
  });
  for (const [index, order] of ['webhook-first', 'callback-first'].entries()) {
    const applicationRef = `RSSS/2026/${String(index + 1).padStart(3, '0')}`;
    applicant = new Applicant({ memberId: member._id, fullName: 'Alex Member', dateOfBirth: new Date('1990-03-02'), applicationRef, email: checkoutData.email, paymentStatus: 'unpaid', paymentExpectedAmount: QUARTERLY_DUES_KOBO });
    member.applicantId = applicant._id; member.applicationRef = applicationRef;
    candidate = { ...transaction, reference: applicationRef.replace(/\//g, '-') };
    const notifyWebhook = () => webhook.POST(webhookRequest(JSON.stringify({ event: 'charge.success', data: candidate }), 'isolated-webhook-test-key'));
    const notifyCallback = () => callback.GET(new NextRequest(`http://localhost/api/payment/verify?reference=${candidate.reference}`));
    assert.equal((await (order === 'webhook-first' ? notifyWebhook() : notifyCallback())).status, 200);
    assert.equal((await (order === 'webhook-first' ? notifyCallback() : notifyWebhook())).status, 200);
    assert.equal((await notifyWebhook()).status, 200);
    assert.equal(notification.mock.callCount(), (index + 1) * 2);
    assert.equal(emails.length, (index + 1) * 3);
    assert.equal(writes, index + 1);
    const registrationAlerts = notification.mock.calls.filter(call => (call.arguments[0] as { type?: string }).type === 'new_registration');
    assert.equal(registrationAlerts.length, index + 1);
    assert.equal((registrationAlerts[index].arguments[0] as { message: string }).message, `${applicant.fullName}'s saved form was automatically submitted after registration payment`);
  }
});
test('event confirmation rejects a different owner, different event, currency or captured amount', async t => {
  isolatedConnection(); const { confirmEventTransaction } = await import('../lib/payments/events');
  const eventId = new mongoose.Types.ObjectId();
  const registration = new EventRegistration({ memberId, eventId, applicantId: new mongoose.Types.ObjectId(), email: checkoutData.email, paymentAmount: 300000, paymentStatus: 'unpaid', paymentRef: 'EVT-test-001' });
  t.mock.method(EventRegistration, 'findOne', () => Promise.resolve(registration) as unknown as ReturnType<typeof EventRegistration.findOne>);
  t.mock.method(Event, 'findById', () => Promise.resolve(new Event({ _id: eventId, registrationFee: 500000 })) as unknown as ReturnType<typeof Event.findById>);
  const update = t.mock.method(EventRegistration, 'updateOne', () => { throw new Error('Must not change registration'); });
  const valid = { ...transaction, reference: 'EVT-test-001', amount: 300000 };
  await assert.rejects(confirmEventTransaction(valid, otherMemberId.toString(), eventId.toString()), /not found for your account/);
  await assert.rejects(confirmEventTransaction(valid, memberId.toString(), new mongoose.Types.ObjectId().toString()), /not found for your account/);
  await assert.rejects(confirmEventTransaction({ ...valid, amount: 500000 }, memberId.toString(), eventId.toString()), /did not match/);
  await assert.rejects(confirmEventTransaction({ ...valid, currency: 'USD' }), /did not match/);
  await assert.rejects(confirmEventTransaction({ ...valid, customer: { email: 'someone@example.org' } }), /did not match/);
  assert.equal(update.mock.callCount(), 0);
});
test('event fees stay fixed at checkout and replayed callbacks cannot credit the event twice', async t => {
  isolatedConnection(); const { confirmEventTransaction } = await import('../lib/payments/events');
  const eventId = new mongoose.Types.ObjectId();
  const registration = new EventRegistration({ memberId, eventId, applicantId: new mongoose.Types.ObjectId(), email: checkoutData.email, paymentAmount: 300000, paymentStatus: 'unpaid', paymentRef: 'EVT-test-001' });
  t.mock.method(EventRegistration, 'findOne', () => Promise.resolve(registration) as unknown as ReturnType<typeof EventRegistration.findOne>);
  t.mock.method(Event, 'findById', () => Promise.resolve(new Event({ _id: eventId, registrationFee: 500000 })) as unknown as ReturnType<typeof Event.findById>);
  let writes = 0;
  t.mock.method(EventRegistration, 'updateOne', (filter: unknown, update: unknown) => {
    assert.deepEqual(filter, { _id: registration._id, paymentStatus: 'unpaid' });
    if (registration.paymentStatus === 'unpaid') { Object.assign(registration, (update as { $set: Record<string, unknown> }).$set); writes++; }
    return Promise.resolve({ acknowledged: true }) as unknown as ReturnType<typeof EventRegistration.updateOne>;
  });
  const candidate = { ...transaction, reference: 'EVT-test-001', amount: 300000 };
  await confirmEventTransaction(candidate, memberId.toString(), eventId.toString());
  await confirmEventTransaction(candidate, memberId.toString(), eventId.toString());
  assert.equal(writes, 1); assert.equal(registration.paymentStatus, 'paid');
});
