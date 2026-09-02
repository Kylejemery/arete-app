'use client';

import Link from 'next/link';
import type { LongitudinalPortrait } from '@/lib/types';

/**
 * The teaser for `/portrait`, and deliberately the first thing on the Progress
 * page: the only item here that says something about who you are rather than
 * how often you showed up. Absent until the weekly agent has built a portrait.
 */
export default function PortraitCard({ portrait }: { portrait: LongitudinalPortrait }) {
  const weeks = portrait.weeks_analyzed ?? 0;
  return (
    <Link
      href="/portrait"
      className="block rounded-xl p-4 hover:opacity-90 transition-opacity"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: '4px solid #c9a84c',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[11px] tracking-[1.6px] uppercase"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Portrait
        </span>
        <span aria-hidden style={{ color: '#c9a84c' }}>
          &rsaquo;
        </span>
      </div>
      <p
        className="text-[15px] leading-[1.6] line-clamp-3"
        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
      >
        {(portrait.philosophical_portrait ?? '').trim()}
      </p>
      <p className="text-[11px] mt-3" style={{ color: '#9aa0a6' }}>
        {weeks} {weeks === 1 ? 'week' : 'weeks'} of your own writing
      </p>
    </Link>
  );
}
