'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  checkAndResetStreakIfMissed,
  getCalendarData,
  getCheckinsRange,
  getJournalEntries,
  getLongitudinalPortrait,
  getReadingData,
  upsertReadingData,
} from '@/lib/db';
import { getItem, setItem } from '@/lib/storage';
import type { Book, LongitudinalPortrait } from '@/lib/types';
import { useRequireUser } from '@/hooks/useRequireUser';
import ChapterRule from '@/components/ChapterRule';
import { Spinner } from '@/components/ui';
import MilestonesCard from '@/components/progress/MilestonesCard';
import MonthCalendar from '@/components/progress/MonthCalendar';
import PortraitCard from '@/components/progress/PortraitCard';
import ReadingTab from '@/components/progress/ReadingTab';
import WeekStrip from '@/components/progress/WeekStrip';
import { HeroCard, PageTitle, SectionCard, StatTile } from '@/components/progress/primitives';
import {
  dayKey,
  formatReadingTime,
  normalizeDayKey,
  type DayMarks,
  type FinishedBook,
  type ProgressSession,
} from '@/components/progress/types';

type Tab = 'overview' | 'reading';

const STREAK_CACHE_KEY = 'arete:progress_streak';

export default function ProgressPage() {
  const { user, loading: authLoading } = useRequireUser();
  const [tab, setTab] = useState<Tab>('overview');
  const [loaded, setLoaded] = useState(false);

  const [streak, setStreak] = useState(0);
  const [portrait, setPortrait] = useState<LongitudinalPortrait | null>(null);
  const [journalCount, setJournalCount] = useState(0);
  const [quoteCount, setQuoteCount] = useState(0);

  const [books, setBooks] = useState<FinishedBook[]>([]);
  const [currentBooks, setCurrentBooks] = useState<Book[]>([]);
  const [sessions, setSessions] = useState<ProgressSession[]>([]);
  const [todayReadingSeconds, setTodayReadingSeconds] = useState(0);

  const [marks, setMarks] = useState<DayMarks>({});
  const [month, setMonth] = useState(() => new Date());

  // Paint the last known streak immediately so the hero never flashes 0 while
  // the profile round-trip is in flight.
  useEffect(() => {
    try {
      const cached = getItem(STREAK_CACHE_KEY);
      if (cached) {
        const value = (JSON.parse(cached) as { streak?: number }).streak;
        if (typeof value === 'number') setStreak(value);
      }
    } catch {
      /* a corrupt cache is not worth reporting */
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    void (async () => {
      const [freshStreak, entries, readingData] = await Promise.all([
        checkAndResetStreakIfMissed(),
        getJournalEntries(),
        getReadingData(),
      ]);
      if (cancelled) return;

      setStreak(freshStreak);
      setItem(STREAK_CACHE_KEY, JSON.stringify({ streak: freshStreak }));

      setJournalCount(entries.filter(e => e.type === 'reflection').length);
      setQuoteCount(entries.filter(e => e.type === 'quote').length);

      setBooks((readingData?.books_read ?? []) as FinishedBook[]);
      setCurrentBooks(readingData?.current_books ?? []);
      setSessions((readingData?.reading_sessions ?? []) as ProgressSession[]);
      // The Focus page stamps the day it counted; a stale stamp means today's
      // total is zero, not yesterday's.
      setTodayReadingSeconds(
        readingData?.today_reading_date === dayKey(new Date())
          ? readingData?.today_reading_seconds ?? 0
          : 0
      );

      setLoaded(true);

      // Null until the weekly agent has enough history — the card is simply
      // absent in that case, so this never blocks the rest of the page.
      getLongitudinalPortrait()
        .then(p => {
          if (!cancelled) setPortrait(p);
        })
        .catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  // Both grids read from one map. The range covers the visible month plus the
  // trailing week, so switching months refetches exactly what is on screen.
  const [rangeStart, rangeEnd] = useMemo(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const start = weekStart < monthStart ? weekStart : monthStart;
    const end = monthEnd > today ? monthEnd : today;
    return [dayKey(start), dayKey(end)];
  }, [month]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    void (async () => {
      const [calendar, checkins] = await Promise.all([
        getCalendarData(),
        getCheckinsRange(rangeStart, rangeEnd),
      ]);
      if (cancelled) return;

      const next: DayMarks = {};
      // calendar_data is the legacy store, written with two different key
      // shapes; check_ins is authoritative and overwrites it where both exist.
      for (const [rawKey, value] of Object.entries(calendar)) {
        const key = normalizeDayKey(rawKey);
        if (key) next[key] = { morning: Boolean(value?.morning), evening: Boolean(value?.evening) };
      }
      for (const checkin of checkins) {
        const key = normalizeDayKey(checkin.check_in_date);
        if (key) next[key] = { morning: Boolean(checkin.morning_done), evening: Boolean(checkin.evening_done) };
      }
      setMarks(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, rangeStart, rangeEnd]);

  const saveBooks = useCallback(async (next: FinishedBook[]) => {
    setBooks(next);
    await upsertReadingData({ books_read: next });
  }, []);

  const shiftMonth = (delta: number) =>
    setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  if (authLoading || !user || !loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={24} label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <PageTitle eyebrow="Chapter VII · Ledger" line1="The days you" line2="showed up." />

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="px-5">
        <div className="flex gap-2">
          {(['overview', 'reading'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-full text-[11px] tracking-[1.4px] uppercase transition-colors"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                background: tab === t ? 'rgba(201,168,76,0.14)' : 'transparent',
                border: tab === t ? '1px solid rgba(201,168,76,0.45)' : '1px solid rgba(255,255,255,0.08)',
                color: tab === t ? '#c9a84c' : '#9aa0a6',
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <ChapterRule />
      </div>

      <div className="px-5 space-y-3">
        {tab === 'overview' ? (
          <>
            {portrait?.philosophical_portrait && <PortraitCard portrait={portrait} />}

            <HeroCard emoji="🔥" value={streak} label="Day Streak" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatTile value={journalCount} label={'Journal\nEntries'} />
              <StatTile value={quoteCount} label={'Quotes\nSaved'} />
              <StatTile value={books.length} label={'Books\nFinished'} />
              <StatTile value={formatReadingTime(todayReadingSeconds)} label={'Read\nToday'} />
            </div>

            <WeekStrip marks={marks} />

            <SectionCard title="Weekly Review 📋">
              <p className="text-[13px] leading-relaxed mb-4" style={{ color: '#9aa0a6' }}>
                Convene the Cabinet for an honest assessment of your week — what went well, what
                fell short, and what matters next.
              </p>
              <Link
                href="/weekly-review"
                className="inline-block px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:opacity-90"
                style={{ background: '#c9a84c', color: '#0f1724' }}
              >
                View Weekly Review
              </Link>
            </SectionCard>

            <MonthCalendar
              month={month}
              marks={marks}
              onPrev={() => shiftMonth(-1)}
              onNext={() => shiftMonth(1)}
            />

            <MilestonesCard streak={streak} />
          </>
        ) : (
          <ReadingTab
            books={books}
            currentBooks={currentBooks}
            sessions={sessions}
            todayReadingSeconds={todayReadingSeconds}
            onSaveBooks={saveBooks}
          />
        )}
      </div>
    </div>
  );
}
