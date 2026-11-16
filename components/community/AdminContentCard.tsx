import { Archive, ArrowUpRight, CalendarDays, Pencil, Users } from 'lucide-react';
import type { CommunityRecord } from '@/lib/community/types';
import { formatDate, formatMoney } from './ContentDetails';
import { SECTION_ICONS } from './SectionTabs';

export default function AdminContentCard({ item, canEdit, busy, onEdit, onArchive }: {
  item: CommunityRecord; canEdit: boolean; busy: boolean; onEdit: () => void; onArchive: () => void;
}) {
  const Icon = SECTION_ICONS[item.kind];
  return <article className="rounded-2xl border border-white/10 bg-[#171b24] p-5 transition-colors hover:border-white/20 sm:p-6">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-500/10 text-emerald-300"><Icon className="h-5 w-5" aria-hidden /></span>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-semibold tracking-tight text-white">{item.title}</h3><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${item.status === 'Published' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : item.status === 'Draft' ? 'border-amber-400/20 bg-amber-400/10 text-amber-200' : 'border-white/10 bg-white/5 text-white/50'}`}><span className="h-1 w-1 rounded-full bg-current" />{item.status}</span></div>
        <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-white/50">{item.summary}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/40">
          {item.kind === 'programmes' && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(item.details.startDate)} · {item.details.location}</span>}
          {item.kind === 'welfare' && <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{item.details.donors.length} donors · {item.details.beneficiaries.length} beneficiaries</span>}
          {item.kind === 'scholarships' && <span>{formatMoney(item.details.awardAmount)} per recipient · {item.details.awardSlots} awards</span>}
          {item.kind === 'minutes' && <span>{formatDate(item.details.meetingDate)} · {item.details.actionItems.length} action points</span>}
          <span className="inline-flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />Updated {formatDate(item.updatedAt)}</span>
        </div>
      </div>
      {canEdit && <div className="flex shrink-0 gap-2"><button type="button" disabled={busy} onClick={onEdit} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/5 disabled:opacity-50"><Pencil className="h-3.5 w-3.5" />Edit</button>{item.status !== 'Archived' && <button type="button" disabled={busy} onClick={onArchive} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/40 transition-colors hover:border-amber-400/25 hover:text-amber-200 disabled:opacity-50" aria-label={`Archive ${item.title}`} title="Archive record"><Archive className="h-4 w-4" /></button>}</div>}
    </div>
  </article>;
}
