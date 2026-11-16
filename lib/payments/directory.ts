import type { PersonEntry } from '@/lib/community/types';
import { eligibleQuarters, normaliseName } from './policy';

export interface DirectoryMember { id: string; fullName: string; membershipNumber?: string; secondarySchool?: string; createdAt: Date; registrationPaid: boolean }
export interface DirectoryInvoice { memberId: string; year: number; quarter: number; status: string }
export function paymentDirectory(members: DirectoryMember[], invoices: DirectoryInvoice[], events: { memberId: string }[], year: number, now = new Date()) {
  return members.map(member => {
    const all = invoices.filter(invoice => invoice.memberId === member.id), current = all.filter(invoice => invoice.year === year);
    const eligible = eligibleQuarters(year, member.createdAt, now);
    const paidQuarters = current.filter(invoice => invoice.status === 'Paid').map(invoice => invoice.quarter).sort();
    const duesPaymentCount = all.filter(invoice => invoice.status === 'Paid').length;
    const registrationPaymentCount = member.registrationPaid ? 1 : 0;
    const eventPaymentCount = events.filter(event => event.memberId === member.id).length;
    const outstanding = eligible.filter(quarter => !paidQuarters.includes(quarter));
    const status = !outstanding.length ? 'Paid' : outstanding.some(quarter => current.some(invoice => invoice.quarter === quarter && invoice.status === 'Pending')) ? 'Pending' : outstanding.some(quarter => current.some(invoice => invoice.quarter === quarter && invoice.status === 'Rejected')) ? 'Rejected' : 'Unpaid';
    return { id: member.id, fullName: member.fullName, membershipNumber: member.membershipNumber, secondarySchool: member.secondarySchool,
      status, paidQuarters, duesPaymentCount, registrationPaymentCount, eventPaymentCount,
      totalPaymentCount: duesPaymentCount + registrationPaymentCount + eventPaymentCount, dueQuarters: eligible, notYetDue: !eligible.length };
  });
}
export function welfareDirectory(members: DirectoryMember[], records: { donors: PersonEntry[]; beneficiaries: PersonEntry[] }[]) {
  const entries = new Map<string, { id: string; fullName: string; contributionCount: number; totalAmount: number; benefitCount: number; isMember: boolean }>();
  const byNumber = new Map(members.filter(m => m.membershipNumber).map(m => [m.membershipNumber!, m]));
  const byName = new Map<string, DirectoryMember[]>();
  for (const member of members) {
    const name = normaliseName(member.fullName);
    byName.set(name, [...(byName.get(name) || []), member]);
    entries.set(member.id, { id: member.id, fullName: member.fullName, contributionCount: 0, totalAmount: 0, benefitCount: 0, isMember: true });
  }
  for (const record of records) for (const kind of ['donors', 'beneficiaries'] as const) for (const person of record[kind]) {
    const named = byName.get(normaliseName(person.name)) || [];
    // An explicit membership number wins. Never merge ambiguous names into a member account.
    const member = person.membershipNumber ? byNumber.get(person.membershipNumber) : named.length === 1 ? named[0] : undefined;
    const id = member?.id || `external:${person.membershipNumber || normaliseName(person.name)}`;
    const entry = entries.get(id) || { id, fullName: person.name, contributionCount: 0, totalAmount: 0, benefitCount: 0, isMember: false };
    if (kind === 'donors') { entry.contributionCount++; entry.totalAmount += person.amount || 0; }
    else entry.benefitCount++;
    entries.set(id, entry);
  }
  return [...entries.values()].sort((a,b) => b.contributionCount - a.contributionCount || a.fullName.localeCompare(b.fullName));
}
