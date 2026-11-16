import { z } from 'zod';

// Association dues are separate from the one-time registration fee.
export const QUARTERLY_DUES_KOBO = 200_000;
export const DUES_START_YEAR = 2026;
export function currentPeriod(now = new Date()) {
  // Nigeria uses UTC+1 year-round; boundaries must match the association's timezone.
  const local = new Date(now.getTime() + 60 * 60 * 1000);
  return { year: local.getUTCFullYear(), quarter: Math.floor(local.getUTCMonth() / 3) + 1 };
}
export function eligibleQuarters(year: number, joinedAt: Date, now = new Date()) {
  const current = currentPeriod(now), joined = currentPeriod(joinedAt);
  if (year < Math.max(DUES_START_YEAR, joined.year) || year > current.year) return [];
  const first = year === joined.year ? joined.quarter : 1;
  const last = year === current.year ? current.quarter : 4;
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first + index);
}
export const duesRequestSchema = z.discriminatedUnion('method', [
  z.object({ year: z.number().int().min(DUES_START_YEAR).max(2100), quarter: z.number().int().min(1).max(4), method: z.literal('paystack') }).strict(),
  z.object({
    year: z.number().int().min(DUES_START_YEAR).max(2100), quarter: z.number().int().min(1).max(4), method: z.literal('bank'),
    bankReference: z.string().trim().min(3).max(150), senderName: z.string().trim().min(3).max(200),
    transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Number.isFinite(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value && value <= new Date(Date.now()+3_600_000).toISOString().slice(0,10), 'Enter a valid transfer date that is not in the future'),
  }).strict(),
]);
export const bankReviewSchema = z.object({
  decision: z.enum(['approve', 'reject']), note: z.string().trim().max(2000).default(''),
}).strict().refine(value => value.decision !== 'reject' || value.note.length >= 3, { message: 'Give a reason when rejecting a transfer', path: ['note'] });
export const paymentCorrectionSchema = z.object({
  operation: z.literal('correct'), status: z.enum(['Paid', 'Unpaid', 'Rejected']),
  amountKobo: z.number().int().min(1).max(1_000_000_000).optional(),
  note: z.string().trim().min(3).max(2000), bankReference: z.string().trim().min(3).max(150).optional(),
}).strict();
export const manualPaymentSchema = z.object({
  memberId: z.string().regex(/^[a-f\d]{24}$/i),
  bankReference: z.string().trim().min(3).max(150), note: z.string().trim().min(3).max(2000),
}).strict();
export const welfareFundSchema = z.object({
  title: z.string().trim().min(3).max(200), description: z.string().trim().max(5000).default(''),
  amountKobo: z.number().int().min(1).max(1_000_000_000), isActive: z.boolean().default(true),
}).strict();
export const welfareRequestSchema = z.discriminatedUnion('method', [
  z.object({ fundId: z.string().regex(/^[a-f\d]{24}$/i), method: z.literal('paystack') }).strict(),
  z.object({ fundId: z.string().regex(/^[a-f\d]{24}$/i), method: z.literal('bank'),
    bankReference: z.string().trim().min(3).max(150), senderName: z.string().trim().min(3).max(200),
    transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Number.isFinite(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value && value <= new Date(Date.now()+3_600_000).toISOString().slice(0,10), 'Enter a valid transfer date that is not in the future'),
  }).strict(),
]);
export interface PaystackTransaction {
  reference: string; status: string; amount: number; currency: string;
  customer?: { email?: string }; paid_at?: string;
  metadata?: { applicationRef?: string; paymentType?: string; invoiceId?: string; memberId?: string };
}
export function validDuesTransaction(transaction: PaystackTransaction, checkout: { reference: string; amountKobo: number; email: string }) {
  return transaction.status === 'success' && transaction.reference === checkout.reference && transaction.currency === 'NGN'
    && transaction.amount === checkout.amountKobo && transaction.customer?.email?.toLowerCase() === checkout.email.toLowerCase();
}
export function normaliseName(name: string) { return name.trim().toLocaleLowerCase('en').replace(/\s+/g, ' '); }
