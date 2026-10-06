'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCheck, Loader2, Mail, MailOpen, Reply, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  repliedAt?: string;
  repliedBy?: string;
  replyMessage?: string;
  createdAt: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Message | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  async function fetchMessages() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/messages');
      const data = await res.json();
      if (data.success) setMessages(data.messages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAllRead() {
    setMarkingRead(true);
    await fetch('/api/admin/messages', { method: 'PATCH' });
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
    setMarkingRead(false);
  }

  async function openMessage(msg: Message) {
    setSelected(msg);
    setReply('');
    setReplyError('');
    setReplySuccess(false);
    // Mark as read locally immediately
    if (!msg.read) {
      setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, read: true } : m));
      // Persist read state via a PATCH to all (cheapest approach — backend marks all)
      // For per-message read, we'd need a separate route; for now mark all is fine
    }
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    setReplyError('');
    try {
      const res = await fetch(`/api/admin/messages/${selected._id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyMessage: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reply');
      setReplySuccess(true);
      const updatedMsg = {
        ...selected,
        read: true,
        repliedAt: new Date().toISOString(),
        replyMessage: reply,
      };
      setMessages(prev => prev.map(m => m._id === selected._id ? updatedMsg : m));
      setSelected(updatedMsg);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
    }
  }

  const unread = messages.filter(m => !m.read).length;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          <p className="text-white/40 text-sm mt-0.5">
            Contact form submissions from the website
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingRead}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all disabled:opacity-50"
          >
            {markingRead ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-white/30" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-white/20">
          <Mail className="h-10 w-10" />
          <p className="text-sm">No messages yet</p>
        </div>
      ) : (
        <div className="flex gap-4 min-h-0" style={{ height: 'calc(100vh - 220px)' }}>

          {/* Message list */}
          <div
            className={cn(
              'flex-shrink-0 overflow-y-auto rounded-2xl',
              selected ? 'hidden lg:flex lg:flex-col w-80' : 'flex flex-col w-full lg:w-80'
            )}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {messages.map((msg) => (
              <button
                key={msg._id}
                onClick={() => openMessage(msg)}
                className={cn(
                  'w-full text-left px-4 py-4 transition-colors border-b last:border-0',
                  'hover:bg-white/[0.04]',
                  selected?._id === msg._id && 'bg-white/[0.06]'
                )}
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-start gap-3">
                  {/* Unread dot */}
                  <span className={cn(
                    'mt-1.5 h-2 w-2 rounded-full flex-shrink-0 transition-colors',
                    msg.read ? 'bg-transparent' : 'bg-[#1a472a]'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm truncate', msg.read ? 'text-white/50 font-normal' : 'text-white font-semibold')}>
                        {msg.name}
                      </p>
                      <span className="text-[11px] text-white/25 flex-shrink-0">{formatDate(msg.createdAt)}</span>
                    </div>
                    <p className={cn('text-xs truncate mt-0.5', msg.read ? 'text-white/30' : 'text-white/70')}>
                      {msg.subject}
                    </p>
                    <p className="text-xs text-white/20 truncate mt-0.5">{msg.message}</p>
                  </div>
                </div>
                {msg.repliedAt && (
                  <div className="mt-2 ml-5 flex items-center gap-1 text-[10px] text-emerald-400/60">
                    <Reply className="h-3 w-3" />
                    <span>Replied</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Message detail / reply panel */}
          <AnimatePresence>
            {selected && (
              <motion.div
                key={selected._id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col min-w-0 rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Detail header */}
                <div className="flex items-start justify-between gap-4 px-6 py-5 border-b flex-shrink-0"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="min-w-0">
                    <h2 className="text-white font-semibold text-base truncate">{selected.subject}</h2>
                    <p className="text-white/40 text-xs mt-1">
                      From <span className="text-white/70">{selected.name}</span>
                      {' '}·{' '}
                      <a href={`mailto:${selected.email}`} className="text-[#4ade80]/70 hover:text-[#4ade80] transition-colors">
                        {selected.email}
                      </a>
                      {' '}·{' '}
                      {new Date(selected.createdAt).toLocaleString('en-GB')}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="flex-shrink-0 text-white/20 hover:text-white transition-colors lg:hidden"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                  {/* Original message */}
                  <div>
                    <p className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-3">Message</p>
                    <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{selected.message}</p>
                  </div>

                  {/* Previous reply */}
                  {selected.repliedAt && selected.replyMessage && (
                    <div className="rounded-xl p-4" style={{ background: 'rgba(26,71,42,0.2)', border: '1px solid rgba(26,71,42,0.4)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Reply className="h-3.5 w-3.5 text-emerald-400" />
                        <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest">
                          Replied by {selected.repliedBy} · {new Date(selected.repliedAt).toLocaleString('en-GB')}
                        </p>
                      </div>
                      <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{selected.replyMessage}</p>
                    </div>
                  )}

                  {/* Reply form */}
                  <div>
                    <p className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-3">
                      {selected.repliedAt ? 'Send another reply' : 'Reply'}
                    </p>
                    <textarea
                      value={reply}
                      onChange={e => { setReply(e.target.value); setReplyError(''); setReplySuccess(false); }}
                      rows={5}
                      placeholder={`Write your reply to ${selected.name}...`}
                      className="w-full rounded-xl px-4 py-3 text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#1a472a]/40 focus:border-[#1a472a]/50 placeholder:text-white/20 resize-none"
                    />

                    {replyError && (
                      <p className="mt-2 text-sm text-red-400">{replyError}</p>
                    )}
                    {replySuccess && (
                      <p className="mt-2 text-sm text-emerald-400 flex items-center gap-1.5">
                        <CheckCheck className="h-4 w-4" /> Reply sent successfully.
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={sendReply}
                        disabled={sending || !reply.trim()}
                        className="flex items-center gap-2 h-9 px-5 rounded-xl text-sm font-semibold bg-[#1a472a] text-white hover:bg-[#2d5f3f] transition-all disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Reply className="h-3.5 w-3.5" />}
                        {sending ? 'Sending…' : 'Send reply'}
                      </button>
                      <p className="text-xs text-white/25">
                        Will be sent to <span className="text-white/40">{selected.email}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state when no message selected on desktop */}
          {!selected && (
            <div className="hidden lg:flex flex-1 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="text-center text-white/20">
                <MailOpen className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm">Select a message to read it</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
