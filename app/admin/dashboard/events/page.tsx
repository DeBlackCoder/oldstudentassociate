'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Users, Trash2, Plus, List } from 'lucide-react';

interface EventItem {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  registrationFee: number;
  isFree: boolean;
  maxAttendees?: number;
  status: 'Draft' | 'Published' | 'Cancelled' | 'Completed';
  registrationCount: number;
}

const STATUS_STYLES: Record<string, { text: string; bg: string }> = {
  Draft: { text: 'text-white/50', bg: 'bg-white/10' },
  Published: { text: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  Cancelled: { text: 'text-red-400', bg: 'bg-red-500/20' },
  Completed: { text: 'text-blue-400', bg: 'bg-blue-500/20' },
};

const CARD_STYLE = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
};

const INPUT_STYLE = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
};

const ACTIVE_TAB_STYLE = {
  background: 'rgba(26,71,42,0.35)',
  boxShadow: 'inset 0 0 0 1px rgba(26,71,42,0.5)',
};

type ActiveTab = 'list' | 'create';

interface FormData {
  title: string;
  description: string;
  date: string;
  location: string;
  feeNaira: string;
  isFree: boolean;
  maxAttendees: string;
  status: 'Draft' | 'Published';
}

const EMPTY_FORM: FormData = {
  title: '',
  description: '',
  date: '',
  location: '',
  feeNaira: '',
  isFree: true,
  maxAttendees: '',
  status: 'Draft',
};

export default function AdminEventsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/events');
      const data = await res.json();
      if (data.success) setEvents(data.events);
    } catch {
      setError('Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          date: formData.date,
          location: formData.location,
          registrationFee: formData.isFree ? 0 : Number(formData.feeNaira),
          isFree: formData.isFree,
          maxAttendees: formData.maxAttendees ? Number(formData.maxAttendees) : undefined,
          status: formData.status,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create event.');
        return;
      }

      setFormData(EMPTY_FORM);
      setActiveTab('list');
      await fetchEvents();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this draft event? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to delete event.');
        return;
      }
      await fetchEvents();
    } catch {
      alert('Failed to delete event.');
    }
  }

  function field(
    label: string,
    key: keyof FormData,
    type = 'text',
    placeholder = '',
    required = true
  ) {
    return (
      <div>
        <label className="block text-white/60 text-xs font-medium mb-1.5">{label}</label>
        <input
          type={type}
          required={required}
          placeholder={placeholder}
          value={formData[key] as string}
          onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
          style={INPUT_STYLE}
          className="rounded-lg px-3 py-2 w-full text-sm outline-none focus:border-[#1a472a] transition-colors"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-white font-bold text-2xl">Events</h1>
        <p className="text-white/40 text-sm mt-1">Manage events and registrations</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {(['list', 'create'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={activeTab === tab ? { ...ACTIVE_TAB_STYLE, color: 'white' } : { color: 'rgba(255,255,255,0.4)' }}
          >
            {tab === 'list' ? <List className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {tab === 'list' ? 'Events' : 'Create Event'}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-red-400 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Events list */}
      {activeTab === 'list' && (
        <div className="rounded-xl overflow-hidden" style={CARD_STYLE}>
          {loading ? (
            <div className="px-6 py-16 text-center text-white/30 text-sm">Loading events…</div>
          ) : events.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Calendar className="h-10 w-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No events yet. Create your first event.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Title', 'Date', 'Location', 'Fee', 'Status', 'Attendees', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/30 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const badge = STATUS_STYLES[event.status] || STATUS_STYLES.Draft;
                    return (
                      <tr
                        key={event._id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-white text-sm font-medium">{event.title}</p>
                          <p className="text-white/30 text-xs mt-0.5 line-clamp-1">{event.description}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-white/60 text-sm">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            {new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-white/60 text-sm">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[120px]">{event.location}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {event.isFree ? (
                            <span className="text-emerald-400">Free</span>
                          ) : (
                            <span className="text-white/70">₦{(event.registrationFee / 100).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.text} ${badge.bg}`}>
                            {event.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-white/60 text-sm">
                            <Users className="h-3.5 w-3.5" />
                            {event.registrationCount}
                            {event.maxAttendees ? ` / ${event.maxAttendees}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {event.status === 'Draft' && (
                            <button
                              onClick={() => handleDelete(event._id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create form */}
      {activeTab === 'create' && (
        <div className="rounded-xl p-6" style={CARD_STYLE}>
          <h2 className="text-white font-bold text-lg mb-6">New Event</h2>
          <form onSubmit={handleCreate} className="space-y-5">
            {field('Event Title', 'title', 'text', 'e.g. Annual Reunion 2025')}
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5">Description</label>
              <textarea
                required
                rows={3}
                placeholder="Describe the event…"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                style={INPUT_STYLE}
                className="rounded-lg px-3 py-2 w-full text-sm outline-none focus:border-[#1a472a] transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('Date & Time', 'date', 'datetime-local', '')}
              {field('Location', 'location', 'text', 'e.g. Port Harcourt Civic Centre')}
            </div>

            {/* Fee toggle */}
            <div>
              <label className="block text-white/60 text-xs font-medium mb-2">Registration Fee</label>
              <div className="flex gap-2 mb-3">
                {[true, false].map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, isFree: val }))}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={formData.isFree === val ? ACTIVE_TAB_STYLE : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
                  >
                    {val ? 'Free' : 'Paid'}
                  </button>
                ))}
              </div>
              {!formData.isFree && (
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5">Amount (₦)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="e.g. 5000"
                    value={formData.feeNaira}
                    onChange={(e) => setFormData((p) => ({ ...p, feeNaira: e.target.value }))}
                    style={INPUT_STYLE}
                    className="rounded-lg px-3 py-2 w-full text-sm outline-none focus:border-[#1a472a] transition-colors"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5">Max Attendees (optional)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="Leave blank for unlimited"
                  value={formData.maxAttendees}
                  onChange={(e) => setFormData((p) => ({ ...p, maxAttendees: e.target.value }))}
                  style={INPUT_STYLE}
                  className="rounded-lg px-3 py-2 w-full text-sm outline-none focus:border-[#1a472a] transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as 'Draft' | 'Published' }))}
                  style={INPUT_STYLE}
                  className="rounded-lg px-3 py-2 w-full text-sm outline-none focus:border-[#1a472a] transition-colors"
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#1a472a] text-white rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-[#1e5c34] transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create Event'}
              </button>
              <button
                type="button"
                onClick={() => { setFormData(EMPTY_FORM); setActiveTab('list'); }}
                className="text-white/40 hover:text-white/70 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
