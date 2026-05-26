'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const navItems = [
  { href: '/',         label: 'Home',        emoji: '🏠' },
  { href: '/morning',  label: 'Morning',      emoji: '☀️' },
  { href: '/evening',  label: 'Evening',      emoji: '🌙' },
  { href: '/cabinet',  label: 'Cabinet',      emoji: '🎙️' },
  { href: '/journal',  label: 'Journal',      emoji: '📖' },
  { href: '/goals',    label: 'Goals',        emoji: '🎯' },
  { href: '/scrolls',  label: 'Scrolls',      emoji: '📜' },
  { href: '/focus',    label: 'Focus',        emoji: '⏱️' },
  { href: '/progress', label: 'Progress',     emoji: '🏆' },
  { href: '/profile',  label: 'Know Thyself', emoji: '👤' },
  { href: '/settings', label: 'Settings',     emoji: '⚙️' },
];

// 5 primary tabs shown in the mobile bottom pill
const BOTTOM_TABS = [
  { href: '/',        label: 'Home',    emoji: '🏠' },
  { href: '/morning', label: 'Morning', emoji: '☀️' },
  { href: '/cabinet', label: 'Cabinet', emoji: '🎙️' },
  { href: '/journal', label: 'Journal', emoji: '📖' },
  { href: '/focus',   label: 'Focus',   emoji: '⏱️' },
];

// Items accessible via the More slide-up drawer
const MORE_ITEMS = [
  { href: '/evening',  label: 'Evening',      emoji: '🌙' },
  { href: '/goals',    label: 'Goals',        emoji: '🎯' },
  { href: '/scrolls',  label: 'Scrolls',      emoji: '📜' },
  { href: '/progress', label: 'Progress',     emoji: '🏆' },
  { href: '/profile',  label: 'Know Thyself', emoji: '👤' },
  { href: '/settings', label: 'Settings',     emoji: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  // Highlight "More" tab when the current page lives in the drawer
  const moreIsActive = MORE_ITEMS.some(item => isActive(item.href));

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <>
      {/* ── Desktop Sidebar (md and above) ─────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-[220px] min-h-screen fixed left-0 top-0 z-30"
        style={{
          background: 'linear-gradient(180deg, #0d1520 0%, #111827 60%, #0d1520 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Wordmark */}
        <div
          className="px-6 pt-7 pb-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h1
            className="text-[#c9a84c] text-[28px] font-bold tracking-[0.10em] leading-none"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)' }}
          >
            Arete
          </h1>
          <p
            className="text-[10px] mt-2 tracking-[0.16em] uppercase leading-none"
            style={{
              color: 'rgba(154,160,166,0.7)',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            be who you want to be
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-5 py-2.5 text-sm transition-all duration-150 relative
                  ${active
                    ? 'text-[#c9a84c] bg-[rgba(201,168,76,0.08)]'
                    : 'text-[#9aa0a6] hover:text-[#e6eef8] hover:bg-[rgba(255,255,255,0.04)]'
                  }
                `}
              >
                {/* Gold left-edge indicator */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-sm"
                    style={{ background: '#c9a84c' }}
                  />
                )}
                <span className="text-base leading-none">{item.emoji}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="p-4 space-y-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Link
            href="/privacy"
            className="block text-[10px] tracking-wide transition-colors hover:text-[#e6eef8]"
            style={{
              color: 'rgba(154,160,166,0.6)',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            Privacy Policy
          </Link>
          <button
            onClick={handleSignOut}
            className="text-[10px] tracking-wide transition-colors hover:opacity-100"
            style={{
              color: 'rgba(248,113,113,0.65)',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Floating-Pill Bottom Nav (below md) ──────────────── */}
      <nav className="md:hidden fixed bottom-4 left-3 right-3 z-50">
        <div
          className="flex rounded-[28px] overflow-hidden"
          style={{
            background: 'rgba(13,21,32,0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          }}
        >
          {BOTTOM_TABS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-2.5 flex-1 relative"
                style={{ color: active ? '#c9a84c' : '#9aa0a6' }}
              >
                {/* Gold indicator line above active tab */}
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-sm"
                    style={{ background: '#c9a84c' }}
                  />
                )}
                <span className="text-xl leading-none">{item.emoji}</span>
                <span
                  className="text-[9px] leading-tight"
                  style={{ fontFamily: 'var(--font-mono, monospace)' }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More tab */}
          <button
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center gap-0.5 py-2.5 flex-1 relative"
            style={{ color: moreIsActive ? '#c9a84c' : '#9aa0a6' }}
          >
            {moreIsActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-sm"
                style={{ background: '#c9a84c' }}
              />
            )}
            <span className="text-xl leading-none">☰</span>
            <span
              className="text-[9px] leading-tight"
              style={{ fontFamily: 'var(--font-mono, monospace)' }}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      {/* ── More Slide-Up Drawer ─────────────────────────────────────── */}
      {showMore && (
        <div
          className="md:hidden fixed inset-0 z-[60]"
          onClick={() => setShowMore(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl px-4 pt-3 pb-8"
            style={{
              background: 'rgba(13,21,32,0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div
              className="w-10 h-1 rounded-full mx-auto mb-4"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            />

            <p
              className="text-[10px] uppercase tracking-[0.2em] mb-3 px-1"
              style={{
                color: 'rgba(154,160,166,0.6)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              More
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {MORE_ITEMS.map(item => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition-all"
                    style={{
                      color: active ? '#c9a84c' : '#9aa0a6',
                      background: active
                        ? 'rgba(201,168,76,0.10)'
                        : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active
                        ? 'rgba(201,168,76,0.20)'
                        : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span
                      className="text-center leading-tight"
                      style={{ fontFamily: 'var(--font-mono, monospace)' }}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-2.5 text-sm transition-colors"
              style={{
                color: 'rgba(248,113,113,0.70)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
