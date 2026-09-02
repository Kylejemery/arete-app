'use client';

// The Cabinet's formal assessment of the week just ended.
//
// Mobile keeps its reviews in AsyncStorage under `weeklyReviews`, so its
// archive is per-device and every past review is labelled with *today's* date
// range. Here they live in the `weekly_reviews` table and each card computes
// its own label from its own week_start / week_end.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getWeeklyReviews, saveWeeklyReview } from '@/lib/db';
import { generateWeeklyReview } from '@/lib/claudeService';
import type { WeeklyReview } from '@/lib/types';
import { useRequireUser } from '@/hooks/useRequireUser';
import { Spinner } from '@/components/ui';

/** Local `YYYY-MM-DD`. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Parse a stored `YYYY-MM-DD` as a LOCAL date. `new Date('2026-09-02')` is UTC
 * midnight, which renders as the previous day west of Greenwich.
 */
function parseDayKey(key: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
  if (!m) return new Date(key);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "Monday, March 2, 2026" — the line under the WEEK OF kicker. */
function weekEndingLabel(weekEnd: string): string {
  return parseDayKey(weekEnd).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "Feb 24 – Mar 2, 2026". */
function rangeLabel(weekStart: string, weekEnd: string): string {
  const start = parseDayKey(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = parseDayKey(weekEnd).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${start} – ${end}`;
}

function generatedLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} ${time}`;
}

export default function WeeklyReviewPage() {
  const { user, loading: authLoading } = useRequireUser();
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = new Date();
  const weekEnd = dayKey(today);
  const weekStartDate = new Date(today);
  weekStartDate.setDate(weekStartDate.getDate() - 6);
  const weekStart = dayKey(weekStartDate);
  const subtitle = rangeLabel(weekStart, weekEnd);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    void (async () => {
      const stored = await getWeeklyReviews();
      if (cancelled) return;
      setReviews(stored);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const content = await generateWeeklyReview();
      const saved = await saveWeeklyReview({
        week_start: weekStart,
        week_end: weekEnd,
        generated_review: content,
      });
      // A failed insert must not throw away a review the user just waited on —
      // show it for this session and let the next generate try again.
      const review: WeeklyReview = saved ?? {
        id: `local-${Date.now()}`,
        week_start: weekStart,
        week_end: weekEnd,
        generated_review: content,
        created_at: new Date().toISOString(),
      };
      setReviews(prev => [review, ...prev.filter(r => r.id !== review.id)].slice(0, 12));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [weekStart, weekEnd]);

  const current = reviews[0] ?? null;
  const past = reviews.slice(1);

  const generateButton = (fullWidth = false) => (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={generating}
      className={`${fullWidth ? 'w-full' : ''} px-5 py-3 rounded-lg text-[13px] font-semibold hover:opacity-90 disabled:cursor-default`}
      style={
        current && !fullWidth
          ? { border: '1px solid #c9a84c', color: '#c9a84c', opacity: generating ? 0.5 : 1 }
          : { background: '#c9a84c', color: '#0f1724', opacity: generating ? 0.5 : 1 }
      }
    >
      {current && !fullWidth ? 'Regenerate' : "Generate This Week's Review"}
    </button>
  );

  if (authLoading || !user || !loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={24} label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10">
      <style>{'@keyframes arete-convene { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }'}</style>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-5">
        <Link href="/progress" className="text-[13px] hover:opacity-80" style={{ color: '#c9a84c' }}>
          &larr; Back
        </Link>
        <h1
          className="text-[26px] font-medium mt-2"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#c9a84c' }}
        >
          Weekly Review
        </h1>
        <p className="text-[12px] mt-1" style={{ color: '#9aa0a6' }}>
          {subtitle}
        </p>

        <div className="mt-4">{generateButton()}</div>

        {generating && (
          <p
            className="text-[14px] italic mt-4"
            style={{
              fontFamily: 'var(--font-serif, Georgia, serif)',
              color: '#c9a84c',
              animation: 'arete-convene 1.6s ease-in-out infinite',
            }}
          >
            The Cabinet is convening…
          </p>
        )}
      </div>

      <div className="px-5 space-y-3 max-w-[760px]">
        {/* ── Error ─────────────────────────────────────────────────── */}
        {error && !generating && (
          <div className="rounded-xl p-4" style={{ background: '#2a1a1a', border: '1px solid rgba(255,68,68,0.2)' }}>
            <p className="text-[14px] leading-relaxed" style={{ color: '#e6eef8' }}>
              {error}
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              className="mt-3 px-4 py-2 rounded-lg text-[13px] font-semibold hover:opacity-90"
              style={{ border: '1px solid #c9a84c', color: '#c9a84c' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── This week's review ────────────────────────────────────── */}
        {current && !generating && (
          <div
            className="rounded-xl p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderLeft: '3px solid #c9a84c',
            }}
          >
            <div
              className="text-[10px] tracking-[2px] uppercase"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
            >
              Week of
            </div>
            <p className="text-[17px] mt-1.5" style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}>
              {weekEndingLabel(current.week_end)}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: '#9aa0a6' }}>
              {rangeLabel(current.week_start, current.week_end)}
            </p>
            <div className="my-4 h-px" style={{ background: 'rgba(201,168,76,0.22)' }} />
            <p className="text-[15px] leading-[26px] whitespace-pre-wrap" style={{ color: '#e6eef8' }}>
              {current.generated_review}
            </p>
            <p className="text-[12px] italic mt-5" style={{ color: '#9aa0a6' }}>
              Generated {generatedLabel(current.created_at)}
            </p>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!current && !generating && !error && (
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-[40px] leading-none">📜</div>
            <p
              className="text-[18px] mt-3"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
            >
              No review yet this week.
            </p>
            <p className="text-[13px] leading-relaxed mt-2 mb-5" style={{ color: '#9aa0a6' }}>
              The Cabinet reviews a week&rsquo;s worth of data — routines, journal entries, reading,
              and reflections — and gives you an honest assessment.
            </p>
            {generateButton(true)}
          </div>
        )}

        {/* ── Archive ───────────────────────────────────────────────── */}
        {past.length > 0 && (
          <div className="pt-4">
            <h2
              className="text-[11px] tracking-[1.6px] uppercase mb-3"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
            >
              Past Reviews
            </h2>
            <div className="space-y-2">
              {past.map(review => {
                const open = expandedId === review.id;
                return (
                  <div
                    key={review.id}
                    className="rounded-xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : review.id)}
                      aria-expanded={open}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:opacity-90"
                    >
                      <span className="text-[13px]" style={{ color: '#e6eef8' }}>
                        Week ending {weekEndingLabel(review.week_end)}
                      </span>
                      <span aria-hidden className="text-[11px]" style={{ color: '#c9a84c' }}>
                        {open ? '▲' : '▼'}
                      </span>
                    </button>
                    {open && (
                      <div className="px-4 pb-4">
                        <p className="text-[11px] mb-3" style={{ color: '#9aa0a6' }}>
                          {rangeLabel(review.week_start, review.week_end)}
                        </p>
                        <p className="text-[14px] leading-[25px] whitespace-pre-wrap" style={{ color: '#e6eef8' }}>
                          {review.generated_review}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
