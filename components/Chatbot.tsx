'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Bot, ChevronDown, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Welcome to RSSSOSAA! I'm your virtual assistant. I can help you with membership registration, application status, events, and anything else about the association.\n\nHow can I help you today?",
};

const QUICK_REPLIES = [
  'How do I register?',
  'What is the membership fee?',
  'How do I check my application?',
  'Who can join RSSSOSAA?',
];

function formatContent(text: string) {
  // Convert [label](/path) markdown links to Next.js-friendly anchors
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      return (
        <Link key={i} href={match[2]} className="underline text-[#1a472a] font-medium hover:text-[#2d5f3f]">
          {match[1]}
        </Link>
      );
    }
    // Bold **text**
    const boldParts = part.split(/\*\*([^*]+)\*\*/g);
    return boldParts.map((bp, j) =>
      j % 2 === 1 ? <strong key={j}>{bp}</strong> : bp
    );
  });
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setUnread(0);
    }
  }, [open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || 'Sorry, something went wrong.';
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply };
      setMessages(prev => [...prev, botMsg]);
      if (!open) setUnread(u => u + 1);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, I could not connect. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {!open && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-lg px-4 py-2.5 text-sm font-medium text-[#1a472a] border border-[#1a472a]/15 max-w-[200px] text-right leading-snug cursor-pointer flex items-center gap-2"
              onClick={() => setOpen(true)}
            >
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              Need help? Ask me anything!
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setOpen(o => !o)}
          className="relative h-14 w-14 rounded-full bg-[#1a472a] text-white shadow-xl hover:bg-[#2d5f3f] transition-all active:scale-95 flex items-center justify-center"
          aria-label={open ? 'Close chat' : 'Open chat'}
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <ChevronDown className="h-6 w-6" />
              </motion.span>
            ) : (
              <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <MessageCircle className="h-6 w-6" />
              </motion.span>
            )}
          </AnimatePresence>
          {unread > 0 && !open && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      </div>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] sm:w-96 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{ height: '520px', maxHeight: 'calc(100vh - 120px)', background: '#fff', border: '1px solid rgba(26,71,42,0.12)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: '#1a472a' }}>
              <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold leading-tight">RSSA Assistant</p>
                <p className="text-white/60 text-xs">RSSSOSAA · Online</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: '#f9faf8' }}>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-full bg-[#1a472a] flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#1a472a] text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="h-7 w-7 rounded-full bg-[#1a472a] flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#1a472a]/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-[#1a472a]/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-[#1a472a]/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick replies — only show after welcome message and no user messages yet */}
            {messages.length === 1 && !loading && (
              <div className="px-4 pb-2 flex flex-wrap gap-2 flex-shrink-0" style={{ background: '#f9faf8' }}>
                {QUICK_REPLIES.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-xs bg-white border border-[#1a472a]/20 text-[#1a472a] rounded-full px-3 py-1.5 hover:bg-[#1a472a] hover:text-white transition-colors font-medium"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 flex-shrink-0 bg-white">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1a472a]/20 focus:border-[#1a472a] placeholder:text-gray-400 disabled:opacity-60 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="h-10 w-10 rounded-xl bg-[#1a472a] text-white flex items-center justify-center hover:bg-[#2d5f3f] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
