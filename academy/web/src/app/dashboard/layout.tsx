'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/navigation/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(true);
  const pathname = usePathname();

  // Pages that manage their own full-screen layout: skip the padding wrapper
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
        {isCoursePage ? (
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
