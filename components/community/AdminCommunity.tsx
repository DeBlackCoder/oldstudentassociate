'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Archive, CheckCircle2, FilePenLine, Plus, Search } from 'lucide-react';
import { CONTENT_KINDS, CONTENT_LABELS, type CommunityRecord, type ContentKind } from '@/lib/community/types';
import { emptyDraft, type EditorDraft } from '@/lib/community/editor';
import ContentEditor from './ContentEditor';
import ScholarshipReview from './ScholarshipReview';
import AdminContentCard from './AdminContentCard';
import SectionTabs, { SECTION_ICONS } from './SectionTabs';

export default function AdminCommunity({ initialKind = 'programmes' }: { initialKind?: ContentKind }) {
  const [tab, setTab] = useState<ContentKind | 'applications'>(initialKind);
  const [items, setItems] = useState<CommunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState<{ initial: EditorDraft; id?: string } | null>(null);
  const [archive, setArchive] = useState<CommunityRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (tab === 'applications') return;
    const controller = new AbortController();
    fetch(`/api/admin/community?kind=${tab}`, { signal: controller.signal })
      .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Unable to load records'); setItems(data.items); setCanEdit(data.canEdit); })
      .catch(e => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tab, revision]);
  function switchTab(next: typeof tab) {
    if (next === tab) return;
    if (editing && !window.confirm('Leave this editor and discard unsaved changes?')) return;
    setTab(next); setEditing(null); setArchive(null); setItems([]); setSearch(''); setStatus(''); setError(''); setMessage(''); setLoading(true); setCanEdit(false);
  }
  function reload() { setError(''); setLoading(true); setRevision(v => v + 1); }
  async function archiveItem() {
    if (!archive) return; setBusy(true); setError('');
    try {
      const res = await fetch(`/api/admin/community/${archive._id}`, { method: 'DELETE' }); const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to archive');
      setArchive(null); setMessage('Record archived. It is no longer visible to readers.'); reload();
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again'); }
    finally { setBusy(false); }
  }
  const visible = items.filter(i => (!status || i.status === status) && `${i.title} ${i.summary}`.toLowerCase().includes(search.toLowerCase()));
  const metrics = [
    { label: 'Published', value: items.filter(i => i.status === 'Published').length, icon: CheckCircle2, tone: 'text-emerald-300 bg-emerald-400/10' },
    { label: 'Drafts', value: items.filter(i => i.status === 'Draft').length, icon: FilePenLine, tone: 'text-amber-200 bg-amber-400/10' },
    { label: 'Archived', value: items.filter(i => i.status === 'Archived').length, icon: Archive, tone: 'text-white/50 bg-white/5' },
  ];
  const Icon = SECTION_ICONS[tab];
  return <div className="space-y-7">
    <div className="flex items-start gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-[#173f26]/45 to-[#171b24] p-6 sm:p-8"><span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-200 sm:flex"><Icon className="h-6 w-6" /></span><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/70">Association management</p><h1 className="text-3xl font-bold tracking-tight text-white">Community portal</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/50">A home for the programmes, people and decisions that move our association forward.</p></div></div>
    <SectionTabs items={[...CONTENT_KINDS, 'applications' as const].map(value => ({ value, label: value === 'applications' ? 'Applications' : CONTENT_LABELS[value] }))} value={tab} onChange={switchTab} dark label="Manage community sections" />
    {tab === 'applications' ? <ScholarshipReview /> : <>
      {error && <p role="alert" className="rounded-xl bg-red-500/10 p-4 text-sm text-red-200">{error} <button className="underline" onClick={reload}>Retry</button></p>}
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
      {editing ? <ContentEditor key={editing.id || `new-${tab}`} initial={editing.initial} id={editing.id} onCancel={() => { if (window.confirm('Discard unsaved changes?')) setEditing(null); }} onSaved={() => { setEditing(null); setMessage('Record saved successfully.'); reload(); }} /> : <>
        <div className="grid grid-cols-3 gap-3">{metrics.map(metric => <div key={metric.label} className="rounded-2xl border border-white/10 bg-[#171b24] p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><p className="text-xs text-white/50">{metric.label}</p><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${metric.tone}`}><metric.icon className="h-4 w-4" /></span></div><p className="mt-2 text-3xl font-bold text-white">{loading ? '—' : metric.value}</p></div>)}</div>
        <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-white">{CONTENT_LABELS[tab]}</h2><p className="mt-1 text-xs text-white/40">Prepare, publish and keep your community informed.</p></div><div className="flex flex-wrap gap-3"><Link href={tab === 'minutes' ? '/members/minutes' : `/${tab}`} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-white/70 hover:bg-white/5">View reader page<ArrowUpRight className="h-3.5 w-3.5" /></Link>{canEdit && <button onClick={() => { setEditing({ initial: emptyDraft(tab) }); setMessage(''); }} className="inline-flex items-center gap-2 rounded-xl bg-[#2d7045] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#358752]"><Plus className="h-4 w-4" />Create record</button>}</div></div>
        {!loading && !canEdit && <p className="text-sm text-amber-200">Your role can view these records. Admin and Super Admin accounts can make changes.</p>}
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#171b24] p-3 sm:flex-row"><label className="relative min-w-0 flex-1"><span className="sr-only">Search records</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-white/35" /><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records by title or summary…" className="h-10 w-full rounded-xl border border-white/10 bg-[#11151d] pl-10 pr-4 text-sm text-white outline-none focus:border-emerald-400/40" /></label><label><span className="sr-only">Filter visibility</span><select value={status} onChange={e => setStatus(e.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[#11151d] px-4 text-xs text-white/70 sm:w-44"><option value="">All visibility states</option><option>Draft</option><option>Published</option><option>Archived</option></select></label></div>
        {archive && <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-5 text-sm text-amber-100"><p>Archive “{archive.title}”? It will be hidden from readers. You can restore it by editing its visibility.</p><div className="mt-3 flex gap-4"><button disabled={busy} onClick={archiveItem} className="font-semibold underline">{busy ? 'Archiving…' : 'Confirm archive'}</button><button disabled={busy} onClick={() => setArchive(null)}>Cancel</button></div></div>}
        {loading ? <div role="status" className="space-y-3"><span className="sr-only">Loading records</span>{[0, 1].map(i => <div key={i} className="h-36 rounded-2xl border border-white/10 bg-white/5 motion-safe:animate-pulse" />)}</div> : !visible.length ? <div className="flex flex-col items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center"><Icon className="mb-4 h-9 w-9 text-emerald-300/40" strokeWidth={1.5} /><h3 className="font-semibold text-white/80">{search || status ? 'No matching records' : 'Start your first update'}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-white/40">{search || status ? 'Adjust your search or visibility filter.' : 'Create a record, review the details, and publish it when you are ready.'}</p>{canEdit && !search && !status && <button onClick={() => setEditing({ initial: emptyDraft(tab) })} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 px-4 py-2.5 text-xs font-semibold text-emerald-300"><Plus className="h-3.5 w-3.5" />Create record</button>}</div> : <div className="space-y-4">{visible.map(item => <AdminContentCard key={item._id} item={item} canEdit={canEdit} busy={busy} onEdit={() => { setEditing({ initial: { kind: item.kind, title: item.title, summary: item.summary, body: item.body, status: item.status, details: { ...item.details } }, id: item._id }); setMessage(''); }} onArchive={() => setArchive(item)} />)}</div>}
      </>}
    </>}
  </div>;
}
