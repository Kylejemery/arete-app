'use client';

import { useState } from 'react';
import type { LongitudinalTheme } from '@/lib/types';

// Emerging themes can run to fifteen or more in an active week. Showing them
// all turns a portrait into a list, so open with a handful and let the reader
// ask for the rest. Expansion is one-way, as on mobile.
const THEMES_COLLAPSED = 5;

export default function ThemeList({
  themes,
  title,
  note,
}: {
  themes: LongitudinalTheme[];
  title: string;
  note: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!themes.length) return null;

  const shown = expanded ? themes : themes.slice(0, THEMES_COLLAPSED);
  const hidden = themes.length - shown.length;

  return (
    <section className="mt-5 pt-6" style={{ borderTop: '1px solid rgba(201,168,76,0.13)' }}>
      <h2
        className="text-[13px] tracking-[1.4px] uppercase mb-1.5"
        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
      >
        {title}
      </h2>
      <p className="text-[13px] leading-5 mb-4" style={{ color: '#7a7a90' }}>
        {note}
      </p>
      {shown.map((t, i) => (
        <div key={`${t.theme}-${i}`} className="flex items-stretch gap-3 mb-3">
          <span className="w-[3px] shrink-0 rounded-sm" style={{ background: 'rgba(201,168,76,0.33)' }} />
          <p className="text-[15px] leading-[23px]" style={{ color: '#d8d8e4' }}>
            {t.theme}
            {t.weeks_seen > 1 && (
              <span className="text-[13px]" style={{ color: '#7a7a90' }}>
                {'  ·  '}
                {t.weeks_seen} weeks
              </span>
            )}
          </p>
        </div>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="py-1.5 text-[13px] tracking-[0.4px] hover:opacity-80"
          style={{ color: '#c9a84c' }}
        >
          {hidden} more
        </button>
      )}
    </section>
  );
}
