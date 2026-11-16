'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { CONTENT_INTROS, CONTENT_LABELS, type CommunityRecord, type ContentKind } from '@/lib/community/types';
import { applicationWindow } from '@/lib/community/policy';
import ContentCard from './ContentCard';
import SectionTabs, { SECTION_ICONS } from './SectionTabs';
import ScholarshipApplications from './ScholarshipApplications';

const PUBLIC_KINDS: ContentKind[] = ['programmes', 'welfare', 'scholarships'];
const SECTION_TAGLINES: Record<ContentKind, string> = {
  programmes: 'Ideas into impact.', welfare: 'A community that cares.',
  scholarships: 'Investing in the next generation.', minutes: 'Our decisions. Our direction.',
};
export default function ContentHub({ initialKind = 'programmes', memberView = false, showTabs = true, embedded = false }: {
  initialKind?: ContentKind; memberView?: boolean; showTabs?: boolean; embedded?: boolean;
}) {
  const [kind, setKind] = useState<ContentKind>(initialKind);
  const [items, setItems] = useState<CommunityRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [revision, setRevision] = useState(0);
  const [applicationRevision, setApplicationRevision] = useState(0);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/community?kind=${kind}`, { signal: controller.signal })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) { setNeedsLogin(res.status === 401); throw new Error(data.error || 'Unable to load this section'); }
        setItems(data.items); setNow(new Date());
      })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [kind, revision]);
  useEffect(() => {
    if (loading || error || embedded) return;
    const recordId = window.location.hash.slice(1);
    if (!recordId.startsWith('record-')) return;
    document.getElementById(recordId)?.scrollIntoView({ block: 'center' });
  }, [loading, error, embedded, kind]);
  function select(next: ContentKind) {
    if (next === kind) return;
    setKind(next); setItems([]); setSearch(''); setFilter(''); setError(''); setNeedsLogin(false); setLoading(true);
  }
  function retry() { setLoading(true); setError(''); setNeedsLogin(false); setRevision(r => r + 1); }
  function recordFilter(item: CommunityRecord) {
    if (item.kind === 'scholarships') return applicationWindow(item, now);
    if (item.kind === 'minutes') return new Date(item.details.meetingDate).getUTCFullYear().toString();
    return item.details.category;
  }
  const filters = [...new Set(items.map(recordFilter))].sort();
  const visible = items.filter(item => (!filter || recordFilter(item) === filter) && `${item.title} ${item.summary} ${item.body}`.toLowerCase().includes(search.toLowerCase()));
  const sorted = [...visible].sort((a, b) => {
    if (embedded) return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (a.kind === 'minutes' && b.kind === 'minutes') return Date.parse(b.details.meetingDate) - Date.parse(a.details.meetingDate);
    if (a.kind === 'programmes' && b.kind === 'programmes') {
      const aDate = Date.parse(a.details.startDate), bDate = Date.parse(b.details.startDate);
      const aUpcoming = aDate >= now.getTime(), bUpcoming = bDate >= now.getTime();
      return aUpcoming !== bUpcoming ? (aUpcoming ? -1 : 1) : aUpcoming ? aDate - bDate : bDate - aDate;
    }
    if (a.kind === 'scholarships' && b.kind === 'scholarships') {
      const priority = { Open: 0, Upcoming: 1, Closed: 2 };
      return priority[applicationWindow(a, now)] - priority[applicationWindow(b, now)] || Date.parse(a.details.deadline) - Date.parse(b.details.deadline);
    }
    return 0;
  });
  const displayed = embedded ? sorted.slice(0, 5) : sorted;
  const Heading = embedded ? 'h2' : 'h1';
  const Icon = SECTION_ICONS[kind];
  const welfareItems = items.filter((item): item is Extract<CommunityRecord, { kind: 'welfare' }> => item.kind === 'welfare');
  const stats = kind === 'welfare' ? [
    ['Initiatives', items.length], ['Donors', welfareItems.reduce((sum, item) => sum + item.details.donors.length, 0)],
    ['Beneficiaries', welfareItems.reduce((sum, item) => sum + item.details.beneficiaries.length, 0)],
  ] : kind === 'scholarships' ? [
    ['Opportunities', items.length], ['Open for applications', items.filter(item => item.kind === 'scholarships' && applicationWindow(item, now) === 'Open').length],
  ] : kind === 'minutes' ? [['Meeting records', items.length]] : [['Published programmes', items.length]];
  return <div className={memberView || embedded ? 'space-y-6' : 'min-h-screen bg-[#EFEDE6] px-4 pb-20 pt-28 sm:px-6 sm:pt-32'}>
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <div className={`relative overflow-hidden rounded-[2rem] border border-[#173f26]/10 ${memberView ? 'bg-[#FCFBF7] p-6 sm:p-8' : 'bg-[#173f26] px-6 py-7 text-white sm:px-10 sm:py-10'}`}>
        {!memberView && <><div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" /><div aria-hidden className="pointer-events-none absolute -bottom-40 right-16 h-80 w-80 rounded-full border border-[#d9b86a]/20" /></>}
        <div className="relative flex items-start justify-between gap-7">
          <div className="max-w-2xl"><p className={`mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] ${memberView ? 'text-[#69846a]' : 'text-[#d9b86a]'}`}><span className={`h-1.5 w-1.5 rounded-full ${memberView ? 'bg-[#69846a]' : 'bg-[#d9b86a]'}`} />RSSSOSAA · {kind === 'minutes' ? 'Member records' : 'Community & impact'}</p>
            <Heading className={`text-3xl font-bold tracking-tight sm:text-5xl ${memberView ? 'text-[#173f26]' : 'text-white'}`}>{CONTENT_LABELS[kind]}</Heading>
            <p className={`mt-3 text-lg font-medium ${memberView ? 'text-neutral-600' : 'text-white/90'}`}>{SECTION_TAGLINES[kind]}</p>
            <p className={`mt-4 max-w-xl text-sm leading-7 ${memberView ? 'text-neutral-500' : 'text-white/65'}`}>{CONTENT_INTROS[kind]}</p>
            <span className={`mt-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${memberView ? 'border-[#173f26]/10 text-[#173f26]' : 'border-white/15 text-white/75'}`}><ShieldCheck className="h-3.5 w-3.5" />{kind === 'minutes' ? 'Available to verified members' : 'Open to members and the public'}</span>
          </div>
          <div aria-hidden className={`hidden h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] sm:flex ${memberView ? 'bg-[#E4EBDD] text-[#173f26]' : 'border border-[#d9b86a]/30 bg-white/5 text-[#d9b86a]'}`}><Icon className="h-12 w-12" strokeWidth={1.25} /></div>
        </div>
      </div>
      {showTabs && <SectionTabs items={(memberView ? [...PUBLIC_KINDS, 'minutes' as const] : PUBLIC_KINDS).map(value => ({ value, label: CONTENT_LABELS[value] }))} value={kind} onChange={select} label="Community sections" />}
      {memberView && kind === 'scholarships' && <ScholarshipApplications key={applicationRevision} />}
      {!loading && !error && items.length > 0 && <dl className="flex flex-wrap gap-x-10 gap-y-4 rounded-2xl border border-[#173f26]/8 bg-[#FCFBF7]/70 px-4 py-3 sm:px-6 sm:py-5">{stats.map(([label, value]) => <div key={label}><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 text-2xl font-bold tracking-tight text-[#173f26]">{value}</dd></div>)}</dl>}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h2 className="text-lg font-bold text-[#173f26]">{embedded ? `Latest ${CONTENT_LABELS[kind].toLowerCase()}` : kind === 'minutes' ? 'Meeting archive' : kind === 'scholarships' ? 'Explore opportunities' : 'Latest updates'}</h2><p className="mt-1 text-xs text-neutral-500">{loading ? 'Finding the latest from your association' : error ? 'Updates are temporarily unavailable' : `${embedded ? `Showing ${displayed.length} of ` : ''}${sorted.length} ${sorted.length === 1 ? 'record' : 'records'}${search || filter ? ' matching your filters' : ' available'}`}</p></div>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row"><label className="relative block"><span className="sr-only">Search {CONTENT_LABELS[kind].toLowerCase()}</span><Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" /><input value={search} onChange={e => setSearch(e.target.value)} type="search" className="h-11 w-full rounded-xl border border-[#173f26]/12 bg-[#FCFBF7] py-3 pl-10 pr-4 text-sm text-neutral-900 outline-none focus:border-[#173f26]/40 focus:ring-2 focus:ring-[#173f26]/10 sm:w-60" placeholder="Search titles and details…" /></label>{filters.length > 1 && <label className="relative block"><span className="sr-only">Filter by {kind === 'minutes' ? 'year' : kind === 'scholarships' ? 'application window' : 'category'}</span><SlidersHorizontal className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-400" /><select value={filter} onChange={e => setFilter(e.target.value)} className="h-11 w-full rounded-xl border border-[#173f26]/12 bg-[#FCFBF7] pl-10 pr-7 text-sm text-neutral-700 sm:max-w-60"><option value="">{kind === 'minutes' ? 'All years' : kind === 'scholarships' ? 'All opportunities' : 'All categories'}</option>{filters.map(value => <option key={value}>{value}</option>)}</select></label>}</div>
      </div>
      {loading ? <div role="status"><p className="sr-only">Loading {CONTENT_LABELS[kind].toLowerCase()}</p><div aria-hidden className="grid gap-5 md:grid-cols-2">{[0, 1].map(i => <div key={i} className="space-y-5 rounded-3xl border border-[#173f26]/8 bg-[#FCFBF7] p-7 motion-safe:animate-pulse"><div className="h-11 w-11 rounded-xl bg-[#E4EBDD]" /><div className="h-5 w-3/4 rounded bg-[#EFEDE6]" /><div className="h-16 rounded bg-[#EFEDE6]" /><div className="h-10 w-1/2 rounded-xl bg-[#E4EBDD]" /></div>)}</div></div> : error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"><p>{error}</p>{needsLogin ? <Link href="/login" className="mt-3 inline-flex items-center gap-2 font-semibold underline">Sign in to read meeting minutes <ArrowUpRight className="h-4 w-4" /></Link> : <button onClick={retry} className="mt-3 font-semibold underline">Try again</button>}</div> : !sorted.length ? <div className="flex flex-col items-center rounded-[1.75rem] border border-dashed border-[#173f26]/20 bg-[#FCFBF7]/70 px-6 py-14 text-center"><span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E4EBDD] text-[#69846a]"><Icon className="h-7 w-7" strokeWidth={1.5} /></span><h2 className="text-lg font-bold text-[#173f26]">{search || filter ? 'No matching records' : `Our ${CONTENT_LABELS[kind].toLowerCase()} will appear here`}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-neutral-500">{search || filter ? 'Try another search or clear your filters to see more.' : 'The association is preparing its next updates. Check back for published details.'}</p>{search || filter ? <button onClick={() => { setSearch(''); setFilter(''); }} className="mt-5 rounded-full border border-[#173f26]/20 px-5 py-2.5 text-sm font-semibold text-[#173f26]">Clear filters</button> : kind !== 'minutes' && <Link href="/contact" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#173f26]">Contact the association <ArrowUpRight className="h-4 w-4" /></Link>}</div> : <div className="grid items-start gap-5 md:grid-cols-2">{displayed.map(record => <ContentCard key={record._id} record={record} now={now} onApplied={() => setApplicationRevision(r => r + 1)} />)}</div>}
      {embedded && <div className="flex justify-center border-t border-[#173f26]/10 pt-6"><Link href={`/${kind}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#173f26] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#245b39] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#173f26]">View all {CONTENT_LABELS[kind].toLowerCase()}<ArrowUpRight className="h-4 w-4" aria-hidden /></Link></div>}
    </div>
  </div>;
}
