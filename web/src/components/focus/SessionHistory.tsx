'use client';

import GlassCard from '@/components/GlassCard';
import { FocusSession, formatDurationReadable } from './types';

interface SessionHistoryProps {
  /** Newest first — the page stores them in that order. */
  sessions: FocusSession[];
}

export default function SessionHistory({ sessions }: SessionHistoryProps) {
  return (
    <GlassCard>
      <div className="p-4">
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-3"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Session History
        </div>

        {sessions.length === 0 ? (
          <p
            className="px-4 py-4 rounded-xl text-center text-[14px]"
            style={{ border: '1px dashed rgba(201,168,76,0.3)', color: '#c9a84c' }}
          >
            No sessions yet. Start reading!
          </p>
        ) : (
          <div className="flex flex-col">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start justify-between gap-3 py-3"
                style={{ borderBottom: '1px solid rgba(201,168,76,0.07)' }}
              >
                <div className="min-w-0">
                  <p
                    className="text-[14px] font-medium"
                    style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                  >
                    {session.bookTitle}
                  </p>
                  {session.bookAuthor && (
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                    >
                      by {session.bookAuthor}
                    </p>
                  )}
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ fontFamily: 'var(--font-mono, monospace)', color: '#5b6473' }}
                  >
                    {session.dateFormatted}
                  </p>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                  >
                    p.{session.startPage} → p.{session.endPage} • {session.pagesRead} pages
                  </p>
                </div>
                <p
                  className="text-[13px] font-bold flex-shrink-0"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                >
                  {formatDurationReadable(session.duration)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
