'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Twelve destinations is past the point where a flat list can be scanned, and
// whatever sits at the bottom falls below the fold on a laptop. Grouped, with
// the writing surfaces together and the Composer at the head of them.
const navSections: { heading: string | null; items: NavItem[] }[] = [
  {
    heading: null,
    items: [{ href: '/dashboard', label: 'Dashboard', icon: '🏛️', mobile: true }],
  },
  {
    heading: 'Study',
    items: [
      { href: '/dashboard/courses', label: 'Courses',     icon: '📚', mobile: true },
      { href: '/dashboard/lexicon', label: 'Lexicon',     icon: '𝛼' },
      { href: '/dashboard/drill',   label: 'Vocab Drill', icon: '🏺' },
    ],
  },
  {
    heading: 'Practice',
    items: [
      { href: '/dashboard/examine',   label: 'Daily Examination', icon: '☀️' },
      { href: '/dashboard/practicum', label: 'Practicum',         icon: '🔥' },
      { href: '/dashboard/courtyard', label: 'The Courtyard',     icon: '⚗️' },
    ],
  },
  {
    heading: 'Write',
    items: [
      { href: '/dashboard/composer',     label: 'Composer',     icon: '🖋️', mobile: true },
      { href: '/dashboard/papers',       label: 'Papers',       icon: '✒️' },
      { href: '/dashboard/dissertation', label: 'Dissertation', icon: '🎓' },
    ],
  },
  {
    heading: 'Reference',
    items: [
      { href: '/dashboard/library', label: 'Library', icon: '📜', mobile: true },
      { href: '/dashboard/profile', label: 'Profile', icon: '👤', mobile: true },
    ],
  },
];

interface NavItem {
  href: string;
  label: string;
  icon: string;
  // Twelve tabs in a bottom bar is five pixels each. Only these ride along.
  mobile?: boolean;
}

const mobileItems = navSections.flatMap(s => s.items).filter(i => i.mobile);

interface SidebarProps {
  navOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ navOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col w-60 min-h-screen bg-academy-surface border-r border-academy-border fixed left-0 top-0 z-40 transition-transform duration-300 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header with collapse button */}
        <div className="p-6 border-b border-academy-border flex items-start justify-between gap-2">
          <div>
            <p className="text-academy-muted text-xs tracking-[0.3em] uppercase mb-1">Arete</p>
            <h1 className="font-serif text-academy-gold text-2xl tracking-wide">Academy</h1>
            <p className="text-academy-muted text-xs mt-1 italic">Advanced Study in Stoic Philosophy</p>
          </div>
          <button
            onClick={onToggle}
            className="mt-1 flex-shrink-0 text-academy-muted hover:text-academy-gold transition-colors text-xl leading-none"
            title="Collapse navigation"
          >
            ‹
          </button>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {navSections.map((section, i) => (
            <div key={section.heading ?? `section-${i}`} className={section.heading ? 'mt-4' : ''}>
              {section.heading && (
                <p className="px-6 pb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-academy-muted/60">
                  {section.heading}
                </p>
              )}
              {section.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                    isActive(item.href)
                      ? 'text-academy-gold bg-academy-bg border-r-2 border-academy-gold'
                      : 'text-academy-muted hover:text-academy-text hover:bg-academy-bg'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-academy-border space-y-2">
          <a
            href="https://app.pursuearete.com"
            className="block text-academy-muted text-xs hover:text-academy-text transition-colors"
          >
            ← Back to Arete
          </a>
          <button
            onClick={handleSignOut}
            className="text-red-400 text-xs hover:text-red-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav — the five that survive a phone-width bar. */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-academy-surface border-t border-academy-border z-50">
        <div className="flex">
          {mobileItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-3 flex-1 text-xs transition-colors ${
                isActive(item.href) ? 'text-academy-gold' : 'text-academy-muted'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
