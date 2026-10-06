import Counter from '@/lib/models/Counter';

/**
 * Generate a unique application reference number.
 * Format: RSSS/YYYY/NNN  (serial resets to 001 each calendar year)
 * Example: RSSS/2026/001, RSSS/2026/002, ...
 *
 * Uses an atomic MongoDB findOneAndUpdate counter to avoid duplicates
 * under concurrent registrations.
 *
 * Requires an active DB connection before calling.
 */
export async function generateApplicationRef(): Promise<string> {
  const year = new Date().getFullYear();
  const counterId = `appRef_${year}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );

  const serial = String(counter.seq).padStart(3, '0');
  return `RSSS/${year}/${serial}`;
}

/**
 * Generate unique membership number.
 * Format: RSSSOSAA/YYYY/XXXXX
 */
export function generateMembershipNumber(year: number, sequence: number): string {
  const paddedSequence = String(sequence).padStart(5, '0');
  return `RSSSOSAA/${year}/${paddedSequence}`;
}

/**
 * Parse and validate membership number.
 */
export function validateMembershipNumber(membershipNumber: string): boolean {
  const regex = /^RSSSOSAA\/\d{4}\/\d{5}$/;
  return regex.test(membershipNumber);
}
