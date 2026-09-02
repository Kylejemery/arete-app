'use client';

import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { getDailyPrompt } from '@/lib/quotes';
import { normalizeCounselorId } from '@/lib/threadService';

// Display metadata for the four counselors the daily rotation uses. Keyed by
// both the long DB slug and the short thread id so either resolves.
const COUNSELOR_META: Record<string, { name: string; initials: string }> = {
  'marcus-aurelius': { name: 'Marcus Aurelius', initials: 'MA' },
  marcus: { name: 'Marcus Aurelius', initials: 'MA' },
  epictetus: { name: 'Epictetus', initials: 'EP' },
  seneca: { name: 'Seneca', initials: 'SN' },
  'david-goggins': { name: 'David Goggins', initials: 'DG' },
  goggins: { name: 'David Goggins', initials: 'DG' },
  'theodore-roosevelt': { name: 'Theodore Roosevelt', initials: 'TR' },
  roosevelt: { name: 'Theodore Roosevelt', initials: 'TR' },
  futureSelf: { name: 'Future Self', initials: 'FS' },
};

export interface TodaysQuestionCardProps {
  /** Today's cached answer, already matched against today's counselor. */
  cachedResponse: string | null;
}

/**
 * The day's question, from the same 14-entry rotation the mobile app uses.
 * Opens the counselor's own thread with the question pre-filled.
 */
export default function TodaysQuestionCard({ cachedResponse }: TodaysQuestionCardProps) {
  const dp = getDailyPrompt();
  const counselorId = normalizeCounselorId(dp.counselorSlug);
  const meta = COUNSELOR_META[counselorId] ?? {
    name: dp.counselorName,
    initials: dp.counselorName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  };
  const href = `/cabinet/chat/${counselorId}?initialMessage=${encodeURIComponent(dp.prompt)}`;

  return (
    <Link href={href} className="block">
      <GlassCard accent>
        <div className="p-4 flex gap-3 items-center">
          <div
            className="rounded-full flex-shrink-0 flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.3)',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 11,
              fontWeight: 600,
              color: '#c9a84c',
            }}
          >
            {meta.initials}
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="text-[9.5px] tracking-[1.6px] uppercase"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
            >
              Today&apos;s Question
            </div>
            <div
              className="italic text-[17px] leading-snug mt-1 tracking-tight line-clamp-2"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
            >
              &ldquo;{dp.prompt}&rdquo;
            </div>
            <div
              className="text-[12px] mt-1.5 font-semibold"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
            >
              — {meta.name}
            </div>
          </div>

          {cachedResponse ? (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
              style={{ background: 'rgba(201,168,76,0.2)', border: '1px solid #c9a84c', color: '#c9a84c' }}
            >
              ✓
            </div>
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
              style={{ background: '#c9a84c', color: '#0f1724' }}
            >
              →
            </div>
          )}
        </div>

        {cachedResponse && (
          <div
            className="mx-4 mb-4 px-3 py-2.5 rounded-lg"
            style={{
              background: 'rgba(201,168,76,0.06)',
              borderTop: '1px solid rgba(201,168,76,0.12)',
            }}
          >
            <p
              className="italic text-[13px] leading-relaxed line-clamp-3"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
            >
              &ldquo;{cachedResponse}&rdquo;
            </p>
          </div>
        )}
      </GlassCard>
    </Link>
  );
}
