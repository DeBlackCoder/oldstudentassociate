import type { ReactNode } from 'react';
import type { CommunityRecord, PersonEntry } from '@/lib/community/types';
import { applicationWindow } from '@/lib/community/policy';

export function formatDate(value?: string, withTime = false) {
  if (!value) return 'Not specified';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' as const } : {}),
    timeZone: value.length === 10 ? 'UTC' : 'Africa/Lagos',
  }).format(new Date(value));
}
export function formatMoney(amount: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(amount);
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-3"><h3 className="text-lg font-bold text-[#173f26]">{title}</h3>{children}</section>;
}
function Points({ items }: { items: string[] }) {
  return items.length ? <ul className="list-disc space-y-2 pl-5 text-neutral-700">{items.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="text-sm text-neutral-500">None recorded.</p>;
}
function Facts({ items }: { items: [string, ReactNode][] }) {
  return <dl className="grid gap-4 rounded-2xl bg-[#ECEBE6] p-5 sm:grid-cols-2">{items.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-[#16201a]">{value}</dd></div>)}</dl>;
}
function People({ title, people }: { title: string; people: PersonEntry[] }) {
  return <Section title={title}>{people.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">{title}</caption><thead className="border-b text-neutral-500"><tr>{['Name', 'Amount / value', 'Date', 'Contribution / support'].map(h => <th key={h} scope="col" className="p-3 font-medium">{h}</th>)}</tr></thead><tbody>{people.map((person, i) => <tr key={i} className="border-b border-neutral-200"><th scope="row" className="p-3 font-semibold">{person.name}</th><td className="whitespace-nowrap p-3">{person.amount === undefined ? 'Not disclosed' : formatMoney(person.amount)}</td><td className="whitespace-nowrap p-3">{formatDate(person.date)}</td><td className="min-w-40 p-3">{person.purpose || '—'}</td></tr>)}</tbody></table></div> : <p className="text-sm text-neutral-500">No names recorded yet.</p>}</Section>;
}
export default function ContentDetails({ record }: { record: CommunityRecord }) {
  return <div className="space-y-7 text-[#16201a]">
    <p className="whitespace-pre-wrap break-words leading-7">{record.body}</p>
    {record.kind === 'programmes' && <>
      <Facts items={[
        ['Category', record.details.category], ['Starts (WAT)', formatDate(record.details.startDate, true)],
        ['Ends (WAT)', formatDate(record.details.endDate, true)], ['Venue / format', record.details.location],
        ['Organiser', record.details.organiser], ['Participation fee', record.details.fee ? formatMoney(record.details.fee) : 'Free'],
        ['Capacity', record.details.capacity ?? 'Not limited'], ['Who can participate', record.details.eligibility],
      ]} />
      <Section title="Programme objectives"><Points items={record.details.objectives} /></Section>
      {record.details.schedule.length > 0 && <Section title="Programme schedule"><ol className="space-y-3">{record.details.schedule.map((s, i) => <li key={i} className="rounded-xl border border-neutral-200 p-4"><span className="mr-3 font-bold text-[#173f26]">{s.time}</span>{s.activity}</li>)}</ol></Section>}
      <div className="flex flex-wrap gap-4"><a className="text-sm font-semibold underline underline-offset-4" href={`mailto:${record.details.contactEmail}`}>Contact the organiser</a>{record.details.registrationUrl && <a href={record.details.registrationUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline underline-offset-4">Register for this programme ↗</a>}</div>
    </>}
    {record.kind === 'welfare' && <>
      <Facts items={[
        ['Support category', record.details.category], ['From', formatDate(record.details.startDate)],
        ['Until', formatDate(record.details.endDate)], ['Fundraising target', record.details.targetAmount === undefined ? 'Not specified' : formatMoney(record.details.targetAmount)],
        ['Recorded donations', formatMoney(record.details.donors.reduce((sum, p) => sum + (p.amount ?? 0), 0))],
        ['Recorded support', formatMoney(record.details.beneficiaries.reduce((sum, p) => sum + (p.amount ?? 0), 0))],
      ]} />
      <People title="Donors" people={record.details.donors} />
      <People title="Beneficiaries" people={record.details.beneficiaries} />
      <p className="text-xs text-neutral-500">Totals include entries with a recorded amount. These are association records; online donations are not collected on this page.</p>
      <a className="inline-block font-semibold underline underline-offset-4" href={`mailto:${record.details.contactEmail}`}>Ask about contributing or receiving support</a>
    </>}
    {record.kind === 'scholarships' && <>
      <Facts items={[
        ['Sponsor', record.details.sponsor], ['Academic level', record.details.academicLevel],
        ['Award per recipient', formatMoney(record.details.awardAmount)], ['Available awards', record.details.awardSlots],
        ['Applications open (WAT)', formatDate(record.details.opensAt, true)], ['Deadline (WAT)', formatDate(record.details.deadline, true)],
        ['Application window', applicationWindow(record)], ['Enquiries', <a key="email" href={`mailto:${record.details.contactEmail}`} className="underline">{record.details.contactEmail}</a>],
      ]} />
      <Section title="Eligibility"><Points items={record.details.eligibility} /></Section>
      <Section title="Required documents"><Points items={record.details.requiredDocuments} /></Section>
      <Section title="Selection process"><p className="whitespace-pre-wrap leading-7">{record.details.selectionProcess}</p></Section>
    </>}
    {record.kind === 'minutes' && <>
      <Facts items={[
        ['Meeting date (WAT)', formatDate(record.details.meetingDate, true)], ['Venue', record.details.location],
        ['Chairperson', record.details.chairperson], ['Secretary', record.details.secretary],
        ['Next meeting (WAT)', formatDate(record.details.nextMeetingDate, true)], ['Last updated', formatDate(record.updatedAt, true)],
      ]} />
      <Section title="Attendees"><Points items={record.details.attendees} /></Section>
      {record.details.apologies.length > 0 && <Section title="Apologies"><Points items={record.details.apologies} /></Section>}
      <Section title="Agenda"><Points items={record.details.agenda} /></Section>
      <Section title="Decisions and resolutions"><Points items={record.details.decisions} /></Section>
      <Section title="Action points">{record.details.actionItems.length ? <div className="space-y-3">{record.details.actionItems.map((item, i) => <div key={i} className="rounded-xl border border-neutral-200 p-4"><p className="font-semibold">{i + 1}. {item.action}</p><p className="mt-2 text-sm text-neutral-600">Owner: {item.owner} · Due: {formatDate(item.dueDate)} · {item.status}</p></div>)}</div> : <p className="text-sm text-neutral-500">No action points recorded.</p>}</Section>
    </>}
  </div>;
}
