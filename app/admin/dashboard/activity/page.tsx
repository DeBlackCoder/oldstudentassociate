'use client';
import { useEffect, useState } from 'react';

type Activity = { _id: string; title: string; message: string; createdAt: string };
export default function ActivityPage() {
  const [items, setItems] = useState<Activity[]>([]), [page, setPage] = useState(1), [pages, setPages] = useState(1);
  const [search, setSearch] = useState(''), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/admin/activity?page=${page}&search=${encodeURIComponent(search)}`, { signal: controller.signal, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load activity');
        setItems(data.items); setPages(data.pages || 1); setError('');
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load activity'); }
    }
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [page, search]);
  return <section className="space-y-5 text-white">
    <div><h1 className="text-2xl font-semibold">Portal activity</h1><p className="mt-1 text-sm text-white/60">Private alerts for account, form, payment and administration changes. Updates every 30 seconds.</p></div>
    <input aria-label="Search portal activity" className="w-full max-w-lg rounded-xl bg-white px-4 py-3 text-black" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search actions or members" />
    {error ? <p role="alert" className="text-red-300">{error}</p> : <div className="divide-y divide-slate-200 rounded-2xl bg-white text-black">{items.length ? items.map(item => <article key={item._id} className="p-5"><p className="font-semibold">{item.title}</p><p className="mt-1 break-words text-sm">{item.message}</p><time className="mt-2 block text-xs">{new Date(item.createdAt).toLocaleString('en-GB')}</time></article>) : <p className="p-6">New actions will appear here.</p>}</div>}
    <div className="flex items-center gap-4"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-40">Previous</button><span className="text-sm">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-40">Next</button></div>
  </section>;
}
