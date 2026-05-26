'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const navItems = [
  { href: '/', label: 'Home', emoji: '🏠' },
  { href: '/morning', label: 'Morning', emoji: '☀️' },
  { href: '/evening', label: 'Evening', emoji: '🌙' },
  { href: '/cabinet', label: 'Cabinet', emoji: '🎙️' },
  { href: '/journal', label: 'Journal', emoji: '📖' },
  { href: '/goals', label: 'Goals', emoji: '🎯' },
  { href: '/scrolls', label: 'Scrolls', emoji: '📜' },
  { href: '/focus', label: 'Focus', emoji: '⏱️' },
  { href: '/progress', label: 'Progress', emoji: '🏆' },
  { href: '/profile', label: 'Know Thyself', emoji: '👤' },
  { href: '/settings', label: 'Settings', emoji: '⚙️' },
];

// 5 primary tabs shown in the mobile bottom bar
const BOTTOM_TABS = [
  { href: '/', label: 'Home', emoji: '🏠' },
  { href: '/morning', label: 'Morning', emoji: '☀️' },
  { href: '/cabinet', label: 'Cabinet', emoji: '🎙️' },
  { href: '/journal', label: 'Journal', emoji: '📖' },
  { href: '/focus', label: 'Focus', emoji: '⏱️' },
];

// Items accessible via the More slide-up drawer
const MORE_ITEMS = [
  { href: '/evening', label: 'Evening', emoji: '🌙' },
  { href: '/goals', label: 'Goals', emoji: '🎯' },
  { href: '/scrolls', label: 'Scrolls', emoji: '📜' },
  { href: '/progress', label: 'Progress', emoji: '🏆' },
  { href: '/profile', label: 'Know Thyself', emoji: '👤' },
  { href: '/settings', label: 'Settings', emoji: '⚙️' },
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
      {/* ── Desktop Sidebar (md and above — unchanged) ─────────────── */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-arete-surface border-r border-arete-border fixed left-0 top-0">
        <div className="p-6 border-b border-arete-border">
          <h1 className="text-arete-gold font-bold text-2xl tracking-widest">ARETE</h1>
          <p className="text-arete-muted text-xs mt-1 italic">Be who you want to be.</p>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  active
                    ? 'text-arete-gold bg-arete-bg border-r-2 border-arete-gold'
                    : 'text-arete-muted hover:text-arete-text hover:bg-arete-bg'
                }`}
              >
                <span className="text-lg">{item.emoji}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-arete-border space-y-2">
          <Link href="/privacy" className="block text-arete-muted text-xs hover:text-arete-text">
            Privacy Policy
          </Link>
          <button
            onClick={handleSignOut}
            className="text-red-400 text-xs hover:text-red-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav (below md) ────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-arete-surface border-t border-arete-border z-50">
        <div className="flex">
          {BOTTOM_TABS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 flex-1 text-xs transition-colors ${
                  active ? 'text-arete-gold' : 'text-arete-muted'
                }`}
              >
                <span className="text-xl leading-none">{item.emoji}</span>
                <span className="leading-tight">{item.label}</span>
              </Link>
            );
          })}

          {/* More tab */}
          <button
            onClick={() => setShowMore(true)}
            className={`flex flex-col items-center gap-0.5 py-2 flex-1 text-xs transition-colors ${
              moreIsActive ? 'text-arete-gold' : 'text-arete-muted'
            }`}
          >
            <span className="text-xl leading-none">☰</span>
            <span className="leading-tight">More</span>
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
            className="absolute bottom-0 left-0 right-0 bg-arete-surface border-t border-arete-border rounded-t-2xl px-4 pt-3 pb-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-arete-border rounded-full mx-auto mb-4" />

            <p className="text-arete-muted text-xs font-semibold uppercase tracking-wider mb-3 px-1">More</p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {MORE_ITEMS.map(item => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs transition-colors ${
                      active
                        ? 'text-arete-gold bg-arete-gold/10'
                        : 'text-arete-muted'
                    }`}
                  >
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-2.5 text-sm text-red-400 hover:text-red-300 transition-colors border-t border-arete-border"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
