'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  checkAndResetStreakIfMissed,
  getDailyQuestionCache,
  getKnowThyselfComplete,
  getTodayCheckin,
  getUserSettings,
} from '@/lib/db';
import { prefetchDailyQuestion } from '@/lib/claudeService';
import { getDailyPrompt } from '@/lib/quotes';
import { getItem, setItem } from '@/lib/storage';
import { normalizeCounselorId } from '@/lib/threadService';
import type { UserSettings } from '@/lib/types';
import ExploreRow from './ExploreRow';
import FutureSelfBanner from './FutureSelfBanner';
import HomeQuoteCard from './HomeQuoteCard';
import KnowThyselfNudge from './KnowThyselfNudge';
import NamePromptModal from './NamePromptModal';
import StatusPills from './StatusPills';
import StreakCard from './StreakCard';
import TodaysQuestionCard from './TodaysQuestionCard';
import WhatsNewModal from './WhatsNewModal';

// Paint-from-cache so the streak never flashes zero. Same key and shape the
// mobile app writes.
const HOME_STATS_KEY = 'arete:home_stats';

// Both dismissals are session-only: they survive navigation inside the app
// and reset on the next visit, exactly like the mobile module-level flags.
const NAME_SKIPPED_KEY = 'arete_name_prompt_skipped';
const BANNER_DISMISSED_KEY = 'arete_onboarding_banner_dismissed';

function sessionFlag(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function setSessionFlag(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
}

function getGreeting(d: Date = new Date()): string {
  const hour = d.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getPrimaryCta(d: Date = new Date()): { label: string; href: string } {
  const hour = d.getHours();
  if (hour < 12) return { label: 'Begin Morning Routine', href: '/morning' };
  if (hour < 17) return { label: 'Open the Cabinet', href: '/cabinet' };
  return { label: 'Evening Reflection', href: '/evening' };
}

function dateLine(d: Date = new Date()): string {
  return `${d.toLocaleDateString('en-US', { weekday: 'long' })} · ${d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })}`;
}

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

/**
 * The signed-in dashboard, in the mobile app's layout order. The guest
 * marketing landing lives in the page itself.
 */
export default function AuthenticatedHome() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [userName, setUserName] = useState('');
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [knowThyselfIncomplete, setKnowThyselfIncomplete] = useState(false);
  const [ktGoalsEmpty, setKtGoalsEmpty] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [namePromptVisible, setNamePromptVisible] = useState(false);
  const [dailyResponse, setDailyResponse] = useState<string | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    setBannerDismissed(sessionFlag(BANNER_DISMISSED_KEY));
    // Step 1: paint from cache so the streak and pills never flash empty.
    try {
      const cached = getItem(HOME_STATS_KEY);
      if (cached) {
        const c = JSON.parse(cached) as { streak?: number; morningDone?: boolean; eveningDone?: boolean };
        setStreak(c.streak ?? 0);
        setMorningDone(c.morningDone ?? false);
        setEveningDone(c.eveningDone ?? false);
      }
    } catch {
      /* corrupt cache — the fetch below fixes it */
    }
    setStatsLoaded(true);
  }, []);

  const load = useCallback(async () => {
    // Step 2: fresh fetch. A user without a name is never redirected away —
    // the name prompt below asks, and the app works either way.
    const fresh = await getUserSettings();
    if (!mounted.current) return;
    setSettings(fresh);
    setUserName(fresh?.user_name ?? '');
    setKtGoalsEmpty(!fresh?.kt_goals || fresh.kt_goals.trim().length === 0);
    if (!fresh?.user_name && !sessionFlag(NAME_SKIPPED_KEY)) setNamePromptVisible(true);

    getKnowThyselfComplete()
      .then((complete) => {
        if (mounted.current) setKnowThyselfIncomplete(!complete);
      })
      .catch(() => {});

    const [checkin, freshStreak, cached] = await Promise.all([
      getTodayCheckin(),
      checkAndResetStreakIfMissed(),
      getDailyQuestionCache(),
    ]);
    if (!mounted.current) return;

    const freshMorning = checkin?.morning_done ?? false;
    const freshEvening = checkin?.evening_done ?? false;
    setStreak(freshStreak);
    setMorningDone(freshMorning);
    setEveningDone(freshEvening);
    setStatsLoaded(true);

    // Step 3: rewrite the cache for the next load.
    setItem(
      HOME_STATS_KEY,
      JSON.stringify({ streak: freshStreak, morningDone: freshMorning, eveningDone: freshEvening })
    );

    // Step 4: pre-generate today's answer in the background, and show it once
    // it lands.
    const dp = getDailyPrompt();
    const counselorId = normalizeCounselorId(dp.counselorSlug);
    setDailyResponse(cached && cached.counselorSlug === counselorId ? cached.response : null);

    prefetchDailyQuestion(counselorId, dp.prompt)
      .then(async () => {
        const after = await getDailyQuestionCache();
        if (mounted.current && after && after.counselorSlug === counselorId) {
          setDailyResponse(after.response);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    void load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const firstName = userName.split(' ')[0];
  const cta = getPrimaryCta();

  return (
    <div className="min-h-screen px-5 pt-6 pb-10 max-w-3xl mx-auto flex flex-col gap-5">
      {/* Name capture — shown while user_settings.user_name is empty */}
      <NamePromptModal
        open={namePromptVisible}
        onSaved={(name) => {
          setUserName(name);
          setNamePromptVisible(false);
          void load();
        }}
        onSkip={() => {
          setSessionFlag(NAME_SKIPPED_KEY);
          setNamePromptVisible(false);
        }}
      />

      {/* One-time announcement, held back while the name prompt is up */}
      <WhatsNewModal suppressed={namePromptVisible} />

      {/* ── Greeting ─────────────────────────────────────────────── */}
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <div
            className="text-[13px] italic tracking-wide"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#c9a84c' }}
          >
            {dateLine()}
          </div>
          <h1
            className="text-[32px] font-medium leading-none tracking-tight mt-1"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
          >
            {userName ? (
              <>
                {getGreeting()},
                <br />
                <em style={{ color: '#c9a84c' }}>{firstName}.</em>
              </>
            ) : (
              <>{getGreeting()}.</>
            )}
          </h1>
        </div>

        <Link
          href="/settings"
          aria-label="Settings"
          className="flex-shrink-0 flex items-center justify-center rounded-xl mt-1 hover:opacity-80 transition-opacity"
          style={{
            width: 40,
            height: 40,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(201,168,76,0.2)',
            color: '#c9a84c',
          }}
        >
          <SettingsIcon />
        </Link>
      </div>

      <div
        className="h-px"
        style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.4), transparent)' }}
      />

      {/* ── Quote of the slot ────────────────────────────────────── */}
      <HomeQuoteCard cabinetMembers={settings?.cabinet_members ?? null} />

      {/* ── Meet Your Future Self ────────────────────────────────── */}
      {knowThyselfIncomplete && !bannerDismissed && (
        <FutureSelfBanner
          onDismiss={() => {
            setSessionFlag(BANNER_DISMISSED_KEY);
            setBannerDismissed(true);
          }}
        />
      )}

      {/* ── Where the day stands ─────────────────────────────────── */}
      <StatusPills morningDone={morningDone} eveningDone={eveningDone} />

      {/* ── Primary call to action ───────────────────────────────── */}
      <Link
        href={cta.href}
        className="flex items-center justify-center gap-2.5 rounded-xl py-4 text-[17px] font-bold hover:opacity-90 transition-opacity"
        style={{ background: '#c9a84c', color: '#0f1724' }}
      >
        {cta.label}
        <span aria-hidden>→</span>
      </Link>

      {/* ── Streak ───────────────────────────────────────────────── */}
      <StreakCard streak={streak} loading={!statsLoaded} />

      {/* ── Today's question ─────────────────────────────────────── */}
      <TodaysQuestionCard cachedResponse={dailyResponse} />

      {/* ── Know Thyself nudge ───────────────────────────────────── */}
      {ktGoalsEmpty && <KnowThyselfNudge />}

      {/* ── Explore ──────────────────────────────────────────────── */}
      <ExploreRow />
    </div>
  );
}
