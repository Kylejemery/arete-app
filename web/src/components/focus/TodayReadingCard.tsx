'use client';

import GlassCard from '@/components/GlassCard';
import { formatDurationReadable } from './types';

interface TodayReadingCardProps {
  /** Seconds read today. */
  todaySeconds: number;
  /** Pages logged in today's sessions. */
  todayPages: number;
}

/** "1h 5m today · 32 pg/hr" — the pace half only when both halves are real. */
export default function TodayReadingCard({ todaySeconds, todayPages }: TodayReadingCardProps) {
  const todayMinutes = todaySeconds / 60;
  const pagesPerHour =
    todayPages > 0 && todayMinutes > 0 ? Math.round((todayPages / todayMinutes) * 60) : null;

  return (
    <GlassCard>
      <div className="p-4 flex items-center gap-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="#c9a84c" strokeWidth="1.5" />
          <path d="M12 7v5l3 2" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div>
          <p
            className="text-[10px] tracking-[1.4px] uppercase"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
          >
            Today&apos;s Reading Time
          </p>
          <p
            className="text-[18px] font-bold"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#c9a84c' }}
          >
            {formatDurationReadable(todaySeconds)} today
            {pagesPerHour != null ? ` · ${pagesPerHour} pg/hr` : ''}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
