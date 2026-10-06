'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, Users, School,
  BarChart3, LogOut, Menu, X, Building2,
  ChevronLeft, ChevronRight, Bell, Search, UserCog, MessageSquare, CalendarDays,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/dashboard/applications', label: 'Applications', icon: FileText },
  { href: '/admin/dashboard/members', label: 'Members', icon: Users },
  { href: '/admin/dashboard/events', label: 'Events', icon: CalendarDays },
  { href: '/admin/dashboard/schools', label: 'Schools', icon: School },
  { href: '/admin/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/dashboard/bank-account', label: 'Bank Account', icon: Building2 },
  { href: '/admin/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/dashboard/admins', label: 'Admin Users', icon: UserCog },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const isExpanded = !collapsed || hovered;
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ _id: string; title: string; message: string; read: boolean; link?: string; createdAt: string; type?: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const [adminName, setAdminName] = useState('Administrator');
  const [adminEmail, setAdminEmail] = useState('');

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  useEffect(() => {
    fetch('/api/admin/session')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setAdminName(data.admin?.fullName || 'Administrator');
        setAdminEmail(data.admin?.email || '');
      })
      .catch(() => router.push('/login'));
  }, [router]);

  // Fetch & poll notifications
  useEffect(() => {
    function fetchNotifs() {
      fetch('/api/admin/notifications')
        .then(r => r.json())
        .then(data => { if (data.success) { setNotifications(data.notifications); setUnreadCount(data.unreadCount); } })
        .catch(() => {});
    }
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close notif on outside click
  useEffect(() => {
    if (!notifOpen) return;
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  async function openNotifications() {
    setNotifOpen(o => !o);
    if (!notifOpen && unreadCount > 0) {
      await fetch('/api/admin/notifications', { method: 'PATCH' });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  }

  async function handleLogout() {    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/login');
  }

  function confirmLogout() {
    setShowLogoutModal(true);
    setProfileOpen(false);
  }

  const initials = adminName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const currentPage = navItems.find(n => pathname === n.href || (n.href !== '/admin/dashboard' && pathname.startsWith(n.href)));

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" style={{ background: '#0f1117' }}>

      {/* ── Desktop Sidebar ─────────────────────────────────────── */}
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 220 : 64 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:flex flex-col flex-shrink-0 overflow-hidden relative z-10"
        style={{
          background: 'rgba(14,18,26,0.98)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
        onMouseEnter={() => { if (collapsed) setHovered(true); }}
        onMouseLeave={() => { setHovered(false); }}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-[#1a472a] flex items-center justify-center text-white text-xs font-bold">
            RS
          </div>
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="ml-3 flex-1 min-w-0"
              >
                <p className="text-white text-sm font-semibold truncate leading-tight">RSSSOSAA</p>
                <p className="text-white/30 text-[10px] truncate">Admin Portal</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => { setCollapsed(c => !c); setHovered(false); }}
            className="ml-auto flex-shrink-0 text-white/20 hover:text-white/60 transition-colors p-1 rounded-md hover:bg-white/5"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} title={collapsed ? label : undefined}>
                <motion.div
                  whileHover={{ x: collapsed ? 0 : 2 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors relative overflow-hidden',
                    !isExpanded ? 'justify-center' : '',
                    active ? 'text-white' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                  )}
                  style={active ? {
                    background: 'rgba(26,71,42,0.35)',
                    boxShadow: 'inset 0 0 0 1px rgba(26,71,42,0.5)',
                  } : {}}
                >
                  {active && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: 'rgba(26,71,42,0.35)', boxShadow: 'inset 0 0 0 1px rgba(26,71,42,0.5)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                  )}
                  <Icon className="h-4 w-4 flex-shrink-0 relative z-10" />
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.18 }}
                        className="font-medium truncate relative z-10 whitespace-nowrap overflow-hidden"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="flex-shrink-0 p-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className={cn('flex items-center gap-3 px-2 py-2 rounded-xl', !isExpanded ? 'justify-center' : '')}>
            <div className="flex-shrink-0 h-7 w-7 rounded-full bg-[#1a472a] flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-white text-xs font-semibold truncate leading-tight">{adminName}</p>
                  <p className="text-white/30 text-[10px] truncate">{adminEmail}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={confirmLogout}
                  className="flex-shrink-0 text-white/20 hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* ── Mobile Sidebar Overlay ─────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 flex flex-col md:hidden"
              style={{ background: 'rgba(14,18,26,0.99)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between h-14 px-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-[#1a472a] flex items-center justify-center text-white text-xs font-bold">RS</div>
                  <p className="text-white text-sm font-semibold">RSSSOSAA</p>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-white/40 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
                  return (
                    <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
                      <div className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                        active ? 'text-white' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                      )} style={active ? { background: 'rgba(26,71,42,0.35)', boxShadow: 'inset 0 0 0 1px rgba(26,71,42,0.5)' } : {}}>
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{label}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-3 border-t flex-shrink-0 space-y-1" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
                >
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="font-medium">Back to site</span>
                </Link>
                <div className="flex items-center gap-3 px-2 py-2">
                  <div className="h-7 w-7 rounded-full bg-[#1a472a] flex items-center justify-center text-white text-xs font-bold">{initials}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{adminName}</p>
                    <p className="text-white/30 text-[10px] truncate">{adminEmail}</p>
                  </div>
                  <button onClick={handleLogout} className="text-white/20 hover:text-red-400 transition-colors">
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex-shrink-0 h-14 flex items-center gap-3 px-4 sm:px-6"
          style={{
            background: 'rgba(14,18,26,0.95)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden flex-shrink-0 text-white/50 hover:text-white transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title — takes remaining space on mobile, pushes actions to the right */}
          <div className="flex-1 flex items-center gap-2 text-sm min-w-0">
            <span className="text-white/30 hidden sm:block">Admin</span>
            <span className="text-white/15 hidden sm:block">/</span>
            <span className="text-white/70 font-medium truncate">{currentPage?.label || 'Dashboard'}</span>
          </div>

          {/* Back to site — desktop only (mobile has it in the sidebar) */}
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 text-xs text-white/30 hover:text-white/70 transition-colors border border-white/[0.08] rounded-lg px-3 h-7 hover:border-white/20 flex-shrink-0"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to site
          </Link>

          {/* Search — desktop only */}
          <div className="max-w-56 hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Search className="h-3.5 w-3.5 text-white/25 flex-shrink-0" />
            <input
              placeholder="Search..."
              style={{ outline: 'none', boxShadow: 'none' }}
              className="bg-transparent text-sm text-white/60 placeholder:text-white/25 w-full border-0 ring-0 focus:ring-0 focus:border-0"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={openNotifications}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white transition-colors hover:bg-white/[0.05] relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none z-10">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-9 z-20 w-80 rounded-xl overflow-hidden"
                    style={{ background: 'rgba(20,24,34,0.98)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                  >
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <p className="text-white text-sm font-semibold">Notifications</p>
                      {notifications.length > 0 && (
                        <span className="text-xs text-white/30">{notifications.length} total</span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-white/30 text-sm">No notifications</div>
                      ) : (
                        notifications.map(n => (
                          <Link
                            key={n._id}
                            href={n.link || '/admin/dashboard'}
                            onClick={() => setNotifOpen(false)}
                            className="flex gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b last:border-0"
                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                          >
                            <span className={`flex-shrink-0 mt-0.5 h-2 w-2 rounded-full ${n.type === 'payment_received' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-white/80 text-xs font-semibold truncate">{n.title}</p>
                              <p className="text-white/40 text-xs truncate mt-0.5">{n.message}</p>
                              <p className="text-white/20 text-[10px] mt-1">{new Date(n.createdAt).toLocaleString('en-GB')}</p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all',
                  profileOpen ? 'ring-2 ring-[#1a472a] ring-offset-1 ring-offset-[#0f1117]' : 'hover:ring-2 hover:ring-white/20'
                )}
                style={{ background: '#1a472a' }}
              >
                {initials}
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-9 z-20 w-52 rounded-xl overflow-hidden"
                      style={{
                        background: 'rgba(20,24,34,0.98)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(16px)',
                      }}
                    >
                      {/* User info */}
                      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <p className="text-white text-sm font-semibold truncate">{adminName}</p>
                        <p className="text-white/40 text-xs truncate mt-0.5">{adminEmail}</p>
                      </div>

                      {/* Menu items */}
                      <div className="p-1.5">
                        <Link
                          href="/admin/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
                        >
                          <LayoutDashboard className="h-3.5 w-3.5" />
                          Dashboard
                        </Link>
                        <div className="my-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                        <button
                          onClick={confirmLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8"
          style={{ background: '#0f1117' }}>
          {children}
        </main>
      </div>

      {/* ── Sign-out confirmation modal ──────────────────────────── */}
      <AnimatePresence>
        {showLogoutModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 bg-black/50"
              style={{ backdropFilter: 'blur(4px)' }}
              onClick={() => setShowLogoutModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl"
              style={{ background: '#1a1f2a', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h2 className="text-white font-semibold text-lg mb-2">Sign out?</h2>
              <p className="text-white/50 text-sm mb-6 leading-relaxed">
                You will be logged out of the admin portal. You can log back in at any time.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-all"
                >
                  Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
