'use client';

import GlassCard from '@/components/GlassCard';
import { FocusBook, formatClock } from './types';

interface ReadingTimerCardProps {
  seconds: number;
  book: FocusBook | null;
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPauseToggle: () => void;
  onStop: () => void;
}

const goldButton = {
  background: 'linear-gradient(135deg, #e3c77a, #8a6f27)',
  color: '#0f1724',
} as const;

/** The big session clock: Start, or Pause/Resume + Stop while a session runs. */
export default function ReadingTimerCard({
  seconds,
  book,
  isRunning,
  isPaused,
  onStart,
  onPauseToggle,
  onStop,
}: ReadingTimerCardProps) {
  return (
    <GlassCard>
      <div className="p-4">
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-3"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Reading Session
        </div>

        <div className="text-center mb-4">
          <div
            className="text-[48px] font-medium leading-none tabular-nums"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e3c77a' }}
          >
            {formatClock(seconds)}
          </div>
          <p
            className="text-[11px] mt-1.5 tracking-[0.5px]"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
          >
            {book
              ? `📖 ${book.title}${book.currentPage ? ` • p.${book.currentPage}` : ''}`
              : 'Select a book below to start'}
          </p>
        </div>

        {!isRunning ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onStart}
              className="rounded-2xl px-8 py-2.5 font-bold text-[13px] transition-opacity hover:opacity-90"
              style={goldButton}
            >
              Start
            </button>
          </div>
        ) : (
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={onPauseToggle}
              className="rounded-2xl px-6 py-2.5 font-bold text-[13px] transition-opacity hover:opacity-90"
              style={goldButton}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={onStop}
              className="rounded-2xl px-6 py-2.5 font-bold text-[13px] transition-opacity hover:opacity-90"
              style={{
                background: 'rgba(255,68,68,0.15)',
                border: '1px solid rgba(255,68,68,0.4)',
                color: '#ff4444',
              }}
            >
              Stop
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
