'use client';

import { clockTime, dayLabel } from '@/lib/messageDates';

/** A thin rule with the day's label, placed above the first message of each day. */
export function DayDivider({ timestamp }: { timestamp: number }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1" style={{ height: 1, background: 'rgba(201,168,76,0.15)' }} />
      <span
        className="text-[10px] tracking-[1.4px] uppercase"
        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
      >
        {dayLabel(timestamp)}
      </span>
      <div className="flex-1" style={{ height: 1, background: 'rgba(201,168,76,0.15)' }} />
    </div>
  );
}

/** Clock time under a message bubble; renders nothing for legacy messages without one. */
export function MessageTime({ timestamp, align }: { timestamp?: number; align: 'left' | 'right' }) {
  if (!timestamp) return null;
  return (
    <div
      className={`text-[10px] mt-1 ${align === 'right' ? 'text-right' : ''}`}
      style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
    >
      {clockTime(timestamp)}
    </div>
  );
}
