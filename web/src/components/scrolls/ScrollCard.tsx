'use client';

import Link from 'next/link';
import type { Scroll } from '@/lib/types';
import { counselorLabel, formatScrollDate } from './counselors';
import FlameIcon from './FlameIcon';

/**
 * One row in Your Scrolls: counselor line + read badge, title, created date
 * and (when it has been opened before) the last-read date.
 */
export default function ScrollCard({ scroll }: { scroll: Scroll }) {
  const readCount = scroll.read_count ?? 0;

  return (
    <Link
      href={`/scrolls/${scroll.id}`}
      className="block rounded-xl px-[18px] py-[18px] transition-colors"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(201,168,76,0.16)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.16)';
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span
          className="text-[10px] tracking-[1.5px] uppercase"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          {counselorLabel(scroll.counselor)}
        </span>
        {readCount > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-lg px-2 py-[3px]"
            style={{
              background: 'rgba(201,168,76,0.07)',
              border: '1px solid rgba(201,168,76,0.2)',
            }}
          >
            <FlameIcon />
            <span
              className="text-[12px] font-semibold"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
            >
              {readCount}
            </span>
          </span>
        )}
      </div>

      <p
        className="text-[17px] leading-snug mb-2.5"
        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
      >
        {scroll.title}
      </p>

      <div className="flex items-center justify-between gap-3">
        <span
          className="text-[11px]"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
        >
          {formatScrollDate(scroll.created_at)}
        </span>
        {scroll.last_read_at && (
          <span
            className="text-[11px] italic"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
          >
            {`Last read ${formatScrollDate(scroll.last_read_at)}`}
          </span>
        )}
      </div>
    </Link>
  );
}
