"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

// Pages that are admin/auth — skip navbar here.
const EXCLUDED_PREFIXES = ["/admin", "/register"];
const EXCLUDED_EXACT: string[] = [];

// Dashboard tab definitions — shown in mobile menu when on /members/dashboard
const DASHBOARD_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'application', label: 'My Application' },
  { id: 'events', label: 'Activities & Events' },
  { id: 'members', label: 'Members' },
  { id: 'benefits', label: 'Benefits' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [member, setMember] = useState<{ fullName?: string; email?: string } | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const isDashboard = pathname === '/members/dashboard' || pathname.startsWith('/members/dashboard');

  // Listen for tab changes from dashboard
  useEffect(() => {
    function onTabChange(e: Event) {
      setActiveTab((e as CustomEvent).detail);
    }
    window.addEventListener('dashboard-tab-change', onTabChange);
    return () => window.removeEventListener('dashboard-tab-change', onTabChange);
  }, []);

  // Sync tab from URL on dashboard load
  useEffect(() => {
    if (isDashboard) {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab');
      if (t) setActiveTab(t);
    }
  }, [isDashboard, pathname]);

  // Check member session on mount
  useEffect(() => {
    fetch('/api/member/me', { credentials: 'include' })
      .then(r => {
        if (r.ok) return r.json();
        return null;
      })
      .then(data => {
        if (data?.success && data.member) {
          setMember(data.member);
        } else {
          setMember(null);
        }
      })
      .catch(() => { setMember(null); })
      .finally(() => setSessionChecked(true));
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // Close on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isExcluded =
    EXCLUDED_EXACT.includes(pathname) ||
    EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isExcluded) return null;

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 w-full pointer-events-none flex justify-center"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Outer wrapper — provides the margin from screen edges */}
      <div className={`px-4 sm:px-6 ${isDashboard ? 'w-[95%] sm:w-[98%] lg:w-[90%]' : 'w-[85%] sm:w-[90%] lg:w-[70%]'}`} style={{ paddingTop: '10px' }}>
        {/* Floating glass pill */}
        <div ref={menuRef} className="pointer-events-auto flex flex-col">
          {/* Pill bar */}
          <div
            style={{
              background: "rgba(246, 245, 240, 0.95)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.6)",
              borderRadius: "16px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
          {/* Top bar */}
          <div className="flex items-center justify-around gap-4 px-4 py-3 sm:px-5">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Image
                src="/logo.png"
                alt="RSSS Old Students Association logo"
                width={36}
                height={36}
                priority
              />
              <div className="flex flex-col gap-0">
                <span className="font-body text-[#1a472a] text-[11px] tracking-widest uppercase leading-tight font-semibold">
                  RSSS
                </span>
                <span className="font-body text-neutral-600 text-[9px] tracking-widest uppercase leading-tight">
                  Old Students Association
                </span>
              </div>
            </Link>

            {/* Desktop nav — shows tabs on dashboard, links elsewhere */}
            <nav className="hidden sm:flex flex-nowrap items-center gap-x-1">
              {isDashboard ? (
                DASHBOARD_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('dashboard-tab-change', { detail: tab.id }));
                      const url = new URL(window.location.href);
                      url.searchParams.set('tab', tab.id);
                      window.history.pushState({}, '', url.toString());
                    }}
                    className={`font-body text-[11px] tracking-widest uppercase transition-colors px-3 py-2 rounded-lg whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-[#1a472a] font-bold bg-[#1a472a]/10'
                        : 'text-[#121417]/70 hover:text-[#1a472a]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))
              ) : (
                navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="relative font-body text-[11px] tracking-widest uppercase transition-colors text-[#121417]/70 hover:text-[#1a472a] px-4 py-3 rounded-lg"
                  >
                    <span className="invisible font-bold block h-0 overflow-hidden" aria-hidden="true">
                      {link.label}
                    </span>
                    <span
                      className={`absolute inset-0 flex items-center justify-center transition-colors ${
                        pathname === link.href || pathname.startsWith(link.href + "/")
                          ? "text-[#1a472a] font-bold"
                          : "text-[#121417]/70 hover:text-[#1a472a]"
                      }`}
                    >
                      {link.label}
                    </span>
                  </Link>
                ))
              )}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {sessionChecked && (
                member ? (
                  /* Signed in — show initials avatar + My Dashboard */
                  <>
                    <Link
                      href="/members/dashboard"
                      className="hidden sm:flex items-center gap-2 font-body text-sm font-semibold text-[#121417] tracking-wide px-6 py-3 hover:text-[#1a472a] transition-colors duration-300"
                    >
                      My Dashboard
                    </Link>
                    <div className="hidden sm:block w-px h-8 bg-[#121417] opacity-30" style={{ borderLeft: '3px double #121417' }} />
                    <Link
                      href="/members/dashboard"
                      className="hidden sm:flex items-center justify-center h-8 w-8 rounded-full bg-[#1a472a] text-white text-xs font-bold"
                      title={member.fullName || member.email}
                    >
                      {(member.fullName || member.email || 'U')
                        .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </Link>
                  </>
                ) : (
                  /* Not signed in — show Login + Become a Member */
                  <>
                    <Link
                      href="/login"
                      className="hidden sm:flex items-center gap-2 font-body text-sm font-semibold text-[#121417] tracking-wide px-6 py-3 hover:text-[#1a472a] transition-colors duration-300"
                    >
                      Login
                    </Link>
                    <div className="hidden sm:block w-px h-8 bg-[#121417] opacity-30" style={{ borderLeft: '3px double #121417' }} />
                    <Link
                      href="/signup"
                      className="hidden sm:flex items-center gap-2 font-body text-sm font-semibold text-[#1a472a] tracking-wide px-8 py-3 hover:text-[#2d5f3f] transition-all duration-300"
                      style={{ borderRadius: "8px" }}
                    >
                      Become a Member
                    </Link>
                  </>
                )
              )}

              {/* Hamburger — visible on mobile via CSS, not JS state */}
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="sm:hidden inline-flex items-center justify-center"
                style={{ borderRadius: "8px", width: 38, height: 36 }}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
              >
                  <span className="flex flex-col gap-[6px] items-center justify-center w-7 h-7 relative">
                    <motion.span
                      className="block h-[2.5px] w-7 bg-[#121417] rounded-full origin-center absolute"
                      animate={menuOpen
                        ? { rotate: 45, y: 0, top: "50%" }
                        : { rotate: 0, top: "20%" }
                      }
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    />
                    <motion.span
                      className="block h-[2.5px] w-7 bg-[#121417] rounded-full absolute top-1/2"
                      animate={menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                      transition={{ duration: 0.15, ease: "easeInOut" }}
                    />
                    <motion.span
                      className="block h-[2.5px] w-7 bg-[#121417] rounded-full origin-center absolute"
                      animate={menuOpen
                        ? { rotate: -45, y: 0, top: "50%" }
                        : { rotate: 0, top: "80%" }
                      }
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    />
                  </span>
                </button>
            </div>
          </div>

          </div>

          {/* Mobile dropdown — separated from the pill */}
          <AnimatePresence initial={false}>
            {menuOpen && (
              <motion.div
                key="mobile-menu"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden sm:hidden"
                style={{
                  marginTop: '9px',
                  background: "rgba(246, 245, 240, 0.97)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  border: "1px solid rgba(255,255,255,0.6)",
                  borderRadius: "16px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
                }}
              >
                <div className="px-4 pb-4 pt-3 grid grid-cols-1 gap-3">
                  {isDashboard ? (
                    /* Dashboard mode — show tabs */
                    <>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold px-1 pb-1">Dashboard</p>
                      {DASHBOARD_TABS.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('dashboard-tab-change', { detail: tab.id }));
                            const url = new URL(window.location.href);
                            url.searchParams.set('tab', tab.id);
                            window.history.pushState({}, '', url.toString());
                            setMenuOpen(false);
                          }}
                          className={`px-4 py-4 font-body text-sm tracking-wide transition-all duration-200 text-center rounded-xl w-full ${
                            activeTab === tab.id
                              ? 'text-[#1a472a] font-semibold bg-[rgba(26,71,42,0.1)]'
                              : 'text-[#121417]/75 hover:text-[#1a472a] bg-[rgba(18,20,23,0.03)]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                      <div className="border-t border-neutral-200 my-1" />
                      <button
                        onClick={async () => {
                          await fetch('/api/member/logout', { method: 'POST' });
                          window.location.href = '/';
                        }}
                        className="px-4 py-4 font-body text-sm tracking-wide text-red-500 hover:text-red-600 transition-colors text-center rounded-xl bg-red-50 w-full"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    /* Normal mode — show nav links + auth */
                    <>
                      {navLinks.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                          className={`px-4 py-8 font-body text-sm tracking-widest uppercase transition-all duration-200 text-center ${
                            pathname === link.href || pathname.startsWith(link.href + "/")
                              ? "text-[#1a472a] font-semibold"
                              : "text-[#121417]/75 hover:text-[#1a472a]"
                          }`}
                          style={{
                            background:
                              pathname === link.href || pathname.startsWith(link.href + "/")
                                ? "rgba(26, 71, 42, 0.1)"
                                : "rgba(18, 20, 23, 0.03)",
                            borderRadius: "10px",
                          }}
                        >
                          {link.label}
                        </Link>
                      ))}
                      {sessionChecked && (
                        member ? (
                          <Link
                            href="/members/dashboard"
                            onClick={() => setMenuOpen(false)}
                            className="px-4 py-8 font-body text-sm tracking-widest uppercase text-[#1a472a] hover:text-[#2d5f3f] transition-colors flex items-center justify-center font-semibold text-center"
                            style={{ background: "rgba(26,71,42,0.07)", borderRadius: "10px" }}
                          >
                            My Dashboard
                          </Link>
                        ) : (
                          <>
                            <Link
                              href="/login"
                              onClick={() => setMenuOpen(false)}
                              className="px-4 py-8 font-body text-sm tracking-widest uppercase text-[#121417]/75 hover:text-[#1a472a] transition-colors flex items-center justify-center font-semibold text-center"
                              style={{ background: "rgba(18, 20, 23, 0.03)", borderRadius: "10px" }}
                            >
                              Login
                            </Link>
                            <Link
                              href="/signup"
                              onClick={() => setMenuOpen(false)}
                              className="px-4 py-8 font-body text-sm tracking-widest uppercase text-[#1a472a] hover:text-[#2d5f3f] transition-colors flex items-center justify-center font-semibold text-center"
                              style={{ borderRadius: "10px" }}
                            >
                              Become a Member
                            </Link>
                          </>
                        )
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
