'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-arete-surface border-r border-arete-border fixed left-0 top-0">
        <div className="p-6 border-b border-arete-border">
          <h1 className="text-arete-gold font-bold text-2xl tracking-widest">ARETE</h1>
          <p className="text-arete-muted text-xs mt-1 italic">Be who you want to be.</p>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isActive
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

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-arete-surface border-t border-arete-border z-50">
        <div className="flex overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-3 px-3 min-w-[60px] flex-shrink-0 text-xs transition-colors ${
                  isActive ? 'text-arete-gold' : 'text-arete-muted'
                }`}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="truncate w-full text-center leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
