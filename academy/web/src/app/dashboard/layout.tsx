'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/navigation/Sidebar';
import { PremiumGate } from '@/components/PremiumGate';

// Free standing: the dashboard, PHIL 701, the Lexicon, the Vocab Drill, the
// Daily Examination, the Courtyard, the Library, and the profile. Everything
// below is Arete Premium; the gate renders a locked card with the upgrade
// path instead of the page.
const PREMIUM_ROUTES: { test: (p: string) => boolean; feature: string; description: string }[] = [
  {
    test: p => /^\/dashboard\/courses\/(?!phil-701(?:\/|$))[^/]+/.test(p),
    feature: 'The full curriculum',
    description: 'PHIL 702 through 707 and the logic and language tracks — each with its seminars, readings, and qualifying conversation.',
  },
  { test: p => p.startsWith('/dashboard/practicum'), feature: 'The Practicum', description: 'Doctrine proven in the field. The anger practicum runs with PHIL 706.' },
  { test: p => p.startsWith('/dashboard/papers'), feature: 'Papers', description: 'Write under supervision and submit for grading.' },
  { test: p => p.startsWith('/dashboard/dissertation'), feature: 'The Dissertation', description: 'The capstone of the programme.' },
  { test: p => p.startsWith('/dashboard/composer'), feature: 'The Composer', description: 'Write with the corpus at your elbow.' },
  { test: p => p.startsWith('/dashboard/morning'), feature: 'The Morning Routine', description: 'A structured start to the examined day.' },
  { test: p => p.startsWith('/dashboard/viva'), feature: 'The Viva', description: 'The qualifying conversation that closes each course.' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(true);
  const pathname = usePathname();

  // Pages that manage their own full-screen layout: skip the padding wrapper
  const premium = PREMIUM_ROUTES.find(r => r.test(pathname ?? ''));
  const isCoursePage =
    /^\/dashboard\/courses\/[^/]+$/.test(pathname ?? '') ||
    pathname === '/dashboard/courtyard' ||
    pathname === '/dashboard/composer';

  return (
    <div className="bg-academy-bg text-academy-text min-h-screen">
      <Sidebar navOpen={navOpen} onToggle={() => setNavOpen(x => !x)} />

      {/* Floating expand button — only visible on desktop when nav is collapsed */}
      {!navOpen && (
        <button
          onClick={() => setNavOpen(true)}
          className="hidden md:flex fixed top-4 left-3 z-50 w-8 h-8 items-center justify-center rounded border border-academy-border bg-academy-surface text-academy-muted hover:text-academy-gold transition-colors text-lg leading-none"
          title="Open navigation"
        >
          ›
        </button>
      )}

      <main
        className={`transition-all duration-300 ${navOpen ? 'md:ml-60' : 'md:ml-0'} pb-24 md:pb-0 min-h-screen`}
      >
        {premium ? (
          <PremiumGate feature={premium.feature} description={premium.description}>
            {isCoursePage ? children : <div className="p-6 md:p-10 max-w-5xl">{children}</div>}
          </PremiumGate>
        ) : isCoursePage ? (
          children
        ) : (
          <div className="p-6 md:p-10 max-w-5xl">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
