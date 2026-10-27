'use client';

import type { CSSProperties } from 'react';

// The course pages are three columns on a desktop: sessions, lesson, and the
// agent. Below `lg` there is room for one, so a tab row picks which column
// shows. Every column stays mounted, so the agent keeps its thread when the
// student goes back to the lesson.

export type MobilePane = 'sessions' | 'lesson' | 'agent';

// Classes for one column: shown on a phone only when it is the active pane,
// always shown from `lg` up with the display it has on a desktop.
export function paneClass(pane: MobilePane, active: MobilePane, desktop: 'block' | 'flex'): string {
  if (pane === active) return desktop === 'flex' ? 'flex' : 'block';
  return desktop === 'flex' ? 'hidden lg:flex' : 'hidden lg:block';
}

// A resizable column's width applies from `lg` up only; on a phone the column
// is full width. Pair with the class `lg:w-[var(--pane-w)]`.
export function paneWidth(width: number): CSSProperties {
  return { '--pane-w': `${width}px` } as CSSProperties;
}

// The course pages fill the viewport. On a phone that is the viewport less the
// fixed bottom nav (Sidebar.tsx), which the dashboard layout already pads for.
export const COURSE_PAGE_HEIGHT = 'h-[calc(100dvh-4.5rem)] md:h-screen';

export function MobilePaneTabs({
  active,
  onChange,
  agentLabel,
  sessionsLabel = 'Sessions',
}: {
  active: MobilePane;
  onChange: (p: MobilePane) => void;
  agentLabel: string;
  sessionsLabel?: string;
}) {
  const tabs: { id: MobilePane; label: string }[] = [
    { id: 'sessions', label: sessionsLabel },
    { id: 'lesson', label: 'Lesson' },
    { id: 'agent', label: agentLabel },
  ];
  return (
    <div role="tablist" className="lg:hidden flex-shrink-0 flex border-b border-academy-border bg-academy-card">
      {tabs.map(t => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest border-b-2 transition-colors ${
            active === t.id
              ? 'border-academy-gold text-academy-gold'
              : 'border-transparent text-academy-muted'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
