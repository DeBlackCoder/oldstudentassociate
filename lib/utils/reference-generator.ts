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
 * Format: RSSSOSA/YYYY/NNNN
 */
export function generateMembershipNumber(year: number, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 9999) {
    throw new RangeError('Membership sequence must be between 1 and 9999');
  }
  const paddedSequence = String(sequence).padStart(4, '0');
  return `RSSSOSA/${year}/${paddedSequence}`;
}

/**
 * Parse and validate current and previously issued membership numbers.
 */
export function validateMembershipNumber(membershipNumber: string): boolean {
  const regex = /^(?:RSSSOSA\/\d{4}\/\d{4}|RSSSOSAA\/\d{4}\/\d{5})$/;
  return regex.test(membershipNumber);
}
