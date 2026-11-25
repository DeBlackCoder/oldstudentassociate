'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Pause, Play, Sparkles } from 'lucide-react';
import { CONTENT_LABELS, type CommunityRecord } from '@/lib/community/types';
import { formatDate, formatMoney } from './ContentDetails';
import { SECTION_ICONS } from './SectionTabs';
import styles from './CommunityHighlights.module.css';

type PublicKind = 'programmes' | 'welfare' | 'scholarships';
interface Highlight {
  id: string;
  kind: PublicKind;
  title: string;
  summary: string;
  detail: string;
  href: string;
}

const KINDS: PublicKind[] = ['programmes', 'welfare', 'scholarships'];

function toHighlight(record: CommunityRecord): Highlight | null {
  if (record.kind === 'minutes') return null;
  const detail = record.kind === 'programmes' ? `${formatDate(record.details.startDate)} · ${record.details.location}`
    : record.kind === 'welfare' ? `${record.details.donors.length} donors · ${record.details.beneficiaries.length} beneficiaries`
    : `${formatMoney(record.details.awardAmount)} award · closes ${formatDate(record.details.deadline)}`;
  return { id: record._id, kind: record.kind, title: record.title, summary: record.summary, detail, href: `/${record.kind}#record-${record._id}` };
}

function HighlightContents({ item }: { item: Highlight }) {
  const Icon = SECTION_ICONS[item.kind];
  return <>
    <div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 text-xs font-semibold text-[#173f26]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E4EBDD]"><Icon className="h-4 w-4" aria-hidden /></span>{CONTENT_LABELS[item.kind]}</span></div>
    <h3 className="mt-5 line-clamp-2 min-h-12 text-xl font-bold leading-6 tracking-tight text-[#173f26]">{item.title}</h3>
    <p className="mt-3 line-clamp-3 min-h-18 text-sm leading-6 text-neutral-600">{item.summary}</p>
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#173f26]/10 pt-4"><p className="line-clamp-2 text-[11px] leading-5 text-neutral-500">{item.detail}</p><ArrowUpRight className="h-4 w-4 shrink-0 text-[#173f26]" aria-hidden /></div>
  </>;
}

export default function CommunityHighlights() {
  const [items, setItems] = useState<Highlight[]>([]);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(KINDS.map(async kind => {
      try {
        const response = await fetch(`/api/community?kind=${kind}`, { signal: controller.signal });
        if (!response.ok) return [];
        const data = await response.json();
        const records = (data.items as CommunityRecord[]).filter(record => record.kind === kind).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        return records.slice(0, 3).map(toHighlight).filter((item): item is Highlight => item !== null);
      } catch {
        return [];
      }
    })).then(groups => {
      if (controller.signal.aborted) return;
      // Interleave the sections, keeping all three visible throughout the loop.
      const next = Array.from({ length: Math.max(...groups.map(group => group.length)) }, (_, index) => groups.map(group => group[index]).filter(Boolean)).flat();
      setItems(next);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return <section aria-labelledby="community-highlights-title" className="overflow-hidden bg-[#EFEDE6] pb-5 pt-14 sm:pt-18">
    <div className="mx-auto mb-7 flex max-w-6xl flex-col justify-between gap-5 px-4 sm:flex-row sm:items-end sm:px-6 lg:px-0">
      <div><p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#69846a]"><Sparkles className="h-3.5 w-3.5" aria-hidden />Our community in action</p><h2 id="community-highlights-title" className="text-3xl font-bold tracking-tight text-[#173f26] sm:text-4xl">Together, we make a difference.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">Programmes that connect us. Welfare that supports us. Scholarships that open doors.</p></div>
      {items.length > 0 && <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-[#173f26]/20 bg-[#FCFBF7] px-4 py-2 text-xs font-semibold text-[#173f26] transition-colors hover:bg-[#E4EBDD] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#173f26] sm:self-auto">{paused ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}{paused ? 'Resume highlights' : 'Pause highlights'}</button>}
    </div>
    {loading ? <p role="status" className="mx-auto max-w-6xl px-4 text-sm text-neutral-500 sm:px-6 lg:px-0">Loading community updates…</p> : items.length ? (
      <div className={styles.viewport} data-paused={paused}>
        <div className={styles.track}>
          <ul className={styles.group} aria-label="Programme, welfare and scholarship highlights">
            {items.map(item => <li key={item.id} className="w-[280px] shrink-0 sm:w-[330px]"><Link href={item.href} className="block h-full rounded-[1.6rem] border border-[#173f26]/10 bg-[#FCFBF7] p-6 shadow-sm transition-colors hover:border-[#173f26]/30 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#173f26]"><HighlightContents item={item} /></Link></li>)}
          </ul>
          <div aria-hidden="true" className={`${styles.group} ${styles.duplicate}`}>
            {items.map(item => <div key={item.id} className="pointer-events-none w-[280px] shrink-0 rounded-[1.6rem] border border-[#173f26]/10 bg-[#FCFBF7] p-6 shadow-sm sm:w-[330px]"><HighlightContents item={item} /></div>)}
          </div>
        </div>
      </div>
    ) : <p className="mx-auto max-w-6xl px-4 text-sm text-neutral-500 sm:px-6 lg:px-0">No community updates have been published yet. Please check back soon.</p>}
  </section>;
}
