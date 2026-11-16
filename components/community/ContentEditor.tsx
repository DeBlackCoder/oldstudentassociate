'use client';
import { useId, useState } from 'react';
import { ArrowLeft, Eye, FileText, Save, Upload } from 'lucide-react';
import { CONTENT_LABELS, type CommunityRecord } from '@/lib/community/types';
import { DETAIL_FIELDS, localDateTime, prepareDraft, type EditorDraft, type EditorField } from '@/lib/community/editor';
import ContentDetails from './ContentDetails';
import { communitySchema } from '@/lib/community/validation';

const inputClass = 'w-full rounded-xl border border-white/15 bg-[#11151d] px-3 py-3 text-sm leading-6 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400/40 disabled:opacity-50';
export default function ContentEditor({ initial, id, onSaved, onCancel }: { initial: EditorDraft; id?: string; onSaved: () => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<EditorDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [preview, setPreview] = useState<CommunityRecord | null>(null);
  const prefix = useId();
  function detail(key: string, value: unknown) { setDraft(d => ({ ...d, details: { ...d.details, [key]: value } })); setPreview(null); }
  function updateRow(key: string, index: number, field: string, value: string) {
    const rows = (draft.details[key] || []) as Record<string, unknown>[];
    detail(key, rows.map((row, i) => i === index ? { ...row, [field]: value } : row));
  }
  function arrayEditor(key: string, label: string, fields: EditorField[], blank: Record<string, unknown>) {
    const rows = (draft.details[key] || []) as Record<string, unknown>[];
    return <fieldset className="space-y-4 rounded-2xl border border-white/10 p-5"><legend className="px-2 text-lg font-bold">{label}</legend>
      {!rows.length && <p className="text-sm text-white/50">No entries yet.</p>}
      {rows.map((row, index) => <div key={index} className="space-y-3 rounded-xl bg-white/5 p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-white/60">Entry {index + 1}</p><button type="button" onClick={() => detail(key, rows.filter((_, i) => i !== index))} className="text-xs text-red-300 underline" aria-label={`Remove ${label} entry ${index + 1}`}>Remove</button></div><div className="grid gap-4 sm:grid-cols-2">{fields.map(field => <label key={field.key} className="block text-sm text-white/70">{field.label}{field.required && ' *'}{field.key === 'status' ? <select value={String(row.status)} onChange={e => updateRow(key, index, field.key, e.target.value)} className={`${inputClass} mt-1.5`}><option>Open</option><option>In Progress</option><option>Completed</option></select> : <input required={field.required} type={field.type || 'text'} min={field.type === 'number' ? 0 : undefined} step={field.type === 'number' ? '0.01' : undefined} maxLength={field.key === 'purpose' || field.key === 'action' ? 1000 : 200} value={String(row[field.key] ?? '')} onChange={e => updateRow(key, index, field.key, e.target.value)} className={`${inputClass} mt-1.5`} />}</label>)}</div></div>)}
      <button type="button" onClick={() => detail(key, [...rows, { ...blank }])} className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-300">+ Add {label.toLowerCase().replace(/s$/, '')}</button>
    </fieldset>;
  }
  async function upload(file?: File) {
    if (!file) return;
    setError(''); setUploadMessage('');
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 200_000) { setError('Choose a .txt or .md file up to 200 KB. PDF and Word documents are not supported.'); return; }
    try {
      const text = await file.text();
      if (text.includes('\u0000') || text.length > 100_000 || text.trim().length < 10) { setError('Use a text file with 10–100,000 characters and no binary content.'); return; }
      setDraft(d => ({ ...d, body: text })); setPreview(null);
      setUploadMessage(`${file.name} loaded. Review the text and save to upload it to the portal.`);
    } catch { setError('Unable to read that file. You can paste the minutes below.'); }
  }
  function parsed() {
    const input = communitySchema.safeParse(prepareDraft(draft));
    if (!input.success) { setError(input.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')); return null; }
    return input.data;
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const data = parsed(); if (!data) return;
    setBusy(true);
    try {
      const res = await fetch(id ? `/api/admin/community/${id}` : '/api/admin/community', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Could not save this record');
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again'); }
    finally { setBusy(false); }
  }
  const personFields: EditorField[] = [{ key: 'name', label: 'Full name', required: true }, { key: 'membershipNumber', label: 'Membership number (optional, links contribution counts)' }, { key: 'amount', label: 'Amount / value (NGN, optional)', type: 'number' }, { key: 'date', label: 'Date', type: 'date' }, { key: 'purpose', label: 'Contribution / support details' }];
  return <form onSubmit={save} className="space-y-6 rounded-3xl border border-white/10 bg-[#171b24] p-5 sm:p-8 text-white">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/60">Content editor</p><h2 className="text-2xl font-bold tracking-tight text-white">{id ? 'Edit' : 'Create'} {CONTENT_LABELS[draft.kind].toLowerCase()}</h2></div><button type="button" disabled={busy} onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold text-white/60 hover:bg-white/5"><ArrowLeft className="h-3.5 w-3.5" />Back to records</button></div>
    <p className="rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-4 py-3 text-xs leading-6 text-emerald-100/60">Published {draft.kind === 'minutes' ? 'minutes are visible to every verified member account.' : 'records are visible to everyone on the website.'} Draft and archived records are visible only to admins.</p>
    {error && <p role="alert" className="break-words rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
    <fieldset disabled={busy} className="space-y-5">
      <h3 className="flex items-center gap-2 border-b border-white/10 pb-3 text-sm font-semibold text-white/80"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-[10px] text-white/40">01</span>Overview & visibility</h3>
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]"><label className="text-sm text-white/70">Title *<input required minLength={3} maxLength={200} className={`${inputClass} mt-1.5`} value={draft.title} onChange={e => { setDraft(d => ({ ...d, title: e.target.value })); setPreview(null); }} /></label><label className="text-sm text-white/70">Visibility<select className={`${inputClass} mt-1.5`} value={draft.status} onChange={e => { setDraft(d => ({ ...d, status: e.target.value as EditorDraft['status'] })); setPreview(null); }}><option>Draft</option><option>Published</option><option>Archived</option></select></label></div>
      <label className="block text-sm text-white/70">Summary *<textarea required minLength={10} maxLength={1000} rows={3} className={`${inputClass} mt-1.5`} value={draft.summary} onChange={e => { setDraft(d => ({ ...d, summary: e.target.value })); setPreview(null); }} /></label>
      {draft.kind === 'minutes' && <div className="rounded-2xl border border-dashed border-emerald-400/25 bg-emerald-400/5 p-5"><label className="block text-sm font-semibold text-white/80"><span className="mb-2 flex items-center gap-2 text-emerald-200"><Upload className="h-4 w-4" />Upload meeting text (.txt / .md)</span><input type="file" accept=".txt,.md,text/plain,text/markdown" className="mt-3 block w-full border-0 bg-transparent p-0 text-xs text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-400/10 file:px-4 file:py-2 file:font-semibold file:text-emerald-200" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label><p className="mt-3 text-xs leading-6 text-white/40">Up to 200 KB, 100,000 characters. File contents replace the text below. Text is displayed as plain text; HTML is not executed.</p>{uploadMessage && <p role="status" className="mt-2 text-sm text-emerald-300">{uploadMessage}</p>}</div>}
      <label className="block text-sm text-white/70">{draft.kind === 'minutes' ? 'Full meeting minutes' : 'Full description'} *<textarea required minLength={10} maxLength={100000} rows={9} className={`${inputClass} mt-1.5`} value={draft.body} onChange={e => { setDraft(d => ({ ...d, body: e.target.value })); setPreview(null); }} /></label>
      <h3 className="flex items-center gap-2 border-b border-white/10 pb-3 pt-4 text-sm font-semibold text-white/80"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-[10px] text-white/40">02</span>{draft.kind === 'minutes' ? 'Meeting details & decisions' : draft.kind === 'scholarships' ? 'Award details & eligibility' : draft.kind === 'welfare' ? 'Welfare initiative details' : 'Programme details'}</h3>
      <div className="grid gap-5 sm:grid-cols-2">{DETAIL_FIELDS[draft.kind].map(field => {
        const value = draft.details[field.key];
        const display = field.type === 'lines' ? (value as string[] || []).join('\n') : field.type === 'datetime-local' && value ? (String(value).endsWith('Z') ? localDateTime(String(value)) : String(value)) : String(value ?? '');
        return <div key={field.key} className={field.type === 'textarea' || field.type === 'lines' ? 'sm:col-span-2' : ''}><label htmlFor={`${prefix}-${field.key}`} className="mb-1.5 block text-sm text-white/70">{field.label}{field.required && ' *'}</label>{field.type === 'textarea' || field.type === 'lines' ? <textarea id={`${prefix}-${field.key}`} required={field.required} maxLength={field.key === 'selectionProcess' ? 5000 : 100000} rows={4} className={inputClass} value={display} onChange={e => detail(field.key, field.type === 'lines' ? e.target.value.split('\n') : e.target.value)} /> : <input id={`${prefix}-${field.key}`} required={field.required} type={field.type || 'text'} min={field.type === 'number' ? (field.key === 'capacity' || field.key === 'awardSlots' ? 1 : 0) : undefined} step={field.type === 'number' ? (field.key === 'capacity' || field.key === 'awardSlots' ? '1' : '0.01') : undefined} maxLength={field.type === 'url' ? 2000 : 254} className={inputClass} value={display} onChange={e => detail(field.key, e.target.value)} />}{field.hint && <p className="mt-1 text-xs text-white/40">{field.hint}</p>}{field.type === 'datetime-local' && <p className="mt-1 text-xs text-white/40">Enter time in your device&apos;s time zone. Readers see West Africa Time.</p>}</div>;
      })}</div>
      {draft.kind === 'programmes' && arrayEditor('schedule', 'Schedule entries', [{ key: 'time', label: 'Time / session', required: true }, { key: 'activity', label: 'Activity', required: true }], { time: '', activity: '' })}
      {draft.kind === 'welfare' && <><p className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-200">Donor and beneficiary names and any amounts you enter will be public when this record is published. Confirm the names and details are appropriate for publication.</p>{arrayEditor('donors', 'Donors', personFields, { name: '', amount: '', date: '', purpose: '' })}{arrayEditor('beneficiaries', 'Beneficiaries', personFields, { name: '', amount: '', date: '', purpose: '' })}</>}
      {draft.kind === 'minutes' && arrayEditor('actionItems', 'Action points', [{ key: 'action', label: 'Action / follow-up', required: true }, { key: 'owner', label: 'Responsible person', required: true }, { key: 'dueDate', label: 'Due date', type: 'date' }, { key: 'status', label: 'Progress' }], { action: '', owner: '', dueDate: '', status: 'Open' })}
    </fieldset>
    <div className="sticky bottom-0 z-10 -mx-5 flex flex-wrap items-center gap-3 border-t border-white/10 bg-[#171b24]/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8"><button disabled={busy} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#2d7045] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#358752] disabled:opacity-50"><Save className="h-4 w-4" />{busy ? 'Saving…' : `Save ${draft.status === 'Published' ? 'and publish' : draft.status.toLowerCase()}`}</button><button type="button" disabled={busy} onClick={() => { setError(''); const data = parsed(); if (data) setPreview({ ...data, _id: id || 'preview', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as CommunityRecord); }} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/70 hover:bg-white/5"><Eye className="h-4 w-4" />Preview</button><p className="hidden text-xs text-white/35 lg:block">Changes go live when saved as Published.</p></div>
    {preview && <div className="rounded-2xl bg-[#F6F5F0] p-6 text-neutral-900"><p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-neutral-500"><FileText className="h-3.5 w-3.5" />Preview · {preview.status}</p><h2 className="text-2xl font-bold text-[#173f26]">{preview.title}</h2><p className="mb-6 mt-2 whitespace-pre-wrap text-neutral-600">{preview.summary}</p><ContentDetails record={preview} /></div>}
  </form>;
}
