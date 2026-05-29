'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getUserSettings,
  hasCheckInToday,
  getProfileStreak,
  getYesterdayCheckin,
  incrementProfileStreak,
  getDailyQuestionCache,
  upsertTodayCheckin,
  getKnowThyselfComplete,
} from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { DAILY_QUOTES, getDailyPrompt } from '@/lib/quotes';
import GlassCard from '@/components/GlassCard';
import StreakArc from '@/components/StreakArc';
import CabinetReplay from '@/components/CabinetReplay';

// ── Counselor display metadata ────────────────────────────────────
const COUNSELOR_META: Record<string, { name: string; initials: string }> = {
  'marcus-aurelius':     { name: 'Marcus Aurelius',    initials: 'MA' },
  'marcus':              { name: 'Marcus Aurelius',    initials: 'MA' },
  'epictetus':           { name: 'Epictetus',          initials: 'EP' },
  'seneca':              { name: 'Seneca',             initials: 'SN' },
  'david-goggins':       { name: 'David Goggins',      initials: 'DG' },
  'goggins':             { name: 'David Goggins',      initials: 'DG' },
  'theodore-roosevelt':  { name: 'Theodore Roosevelt', initials: 'TR' },
  'futureSelf':          { name: 'Future Self',        initials: 'FS' },
};

// ── Helpers ───────────────────────────────────────────────────────
function toRoman(n: number): string {
  if (n <= 0) return '–';
  const map: [string, number][] = [
    ['M',1000],['CM',900],['D',500],['CD',400],['C',100],
    ['XC',90],['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1],
  ];
  let result = '';
  for (const [s, v] of map) while (n >= v) { result += s; n -= v; }
  return result;
}

const ONES = [
  '','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
  'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen',
];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function numberToWords(n: number): string {
  if (n <= 0)  return 'Zero';
  if (n < 20)  return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10].toLowerCase() : '');
  return n.toString();
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function getDayOfWeek(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function getMonthDay(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'checking' | 'guest' | 'authenticated'>('checking');
  const [userName, setUserName] = useState('');
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [knowThyselfIncomplete, setKnowThyselfIncomplete] = useState(false);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);
  const [streak, setStreak] = useState(0);
  const [dailyQuestion, setDailyQuestion] = useState<{ counselorSlug: string; response: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthState('guest');
        return;
      }
      const [settings, morningDoneToday, eveningDoneToday, streakVal, dqCache, ktComplete] = await Promise.all([
        getUserSettings(),
        hasCheckInToday('morning'),
        hasCheckInToday('evening'),
        getProfileStreak(),
        getDailyQuestionCache(),
        getKnowThyselfComplete(),
      ]);
      if (!settings?.user_name) {
        router.replace('/setup');
        return;
      }
      setUserName(settings.user_name);
      setKnowThyselfIncomplete(!settings.kt_goals || settings.kt_goals.trim().length === 0);
      setMorningDone(morningDoneToday);
      setEveningDone(eveningDoneToday);

      // Show onboarding banner if not complete and not dismissed this session
      if (!ktComplete && typeof window !== 'undefined') {
        const dismissed = sessionStorage.getItem('arete_onboarding_banner_dismissed');
        if (!dismissed) setShowOnboardingBanner(true);
      }

      // ── Streak increment (once per calendar day, atomic via DB) ──────
      // The gate is now streak_last_incremented_date on profiles — atomic
      // at the Postgres level, so multiple devices on the same day only
      // increment once regardless of which device loads the home screen first.
      {
        const yCheckin = await getYesterdayCheckin();
        const yTasks = (yCheckin?.morning_tasks as Array<{ done: boolean }> | null) ?? [];
        // Threshold: at least 1 morning discipline completed yesterday.
        const earnedStreak = yTasks.some(t => t.done) || Boolean(yCheckin?.morning_done);
        if (earnedStreak) {
          const incremented = await incrementProfileStreak();
          setStreak(incremented);
        } else {
          setStreak(streakVal);
        }
      }

      // Save today's counselor slug so mobile can verify cache validity
      if (!dqCache) {
        const dp = getDailyPrompt();
        upsertTodayCheckin({ daily_question_counselor: dp.counselorSlug }).catch(() => {});
      }
      setDailyQuestion(dqCache);
      setAuthState('authenticated');
      setLoaded(true);
    }
    load();
  }, [router]);

  // ── Guest: marketing landing page ────────────────────────────────
  if (authState === 'guest') {
    return (
      <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
        {/* Nav */}
        <nav
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.12)' }}
        >
          <span
            className="text-xl tracking-[0.2em] uppercase"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#c9a84c' }}
          >
            Arete
          </span>
          <Link
            href="/login"
            className="px-4 py-2 rounded-full text-xs tracking-widest uppercase transition-opacity hover:opacity-80"
            style={{
              border: '1px solid rgba(201,168,76,0.4)',
              color: '#c9a84c',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            Sign In
          </Link>
        </nav>

        {/* Cabinet Replay hero */}
        <CabinetReplay />

        {/* CTA */}
        <div className="text-center py-16 px-6">
          <a
            href="https://apps.apple.com/app/id6762371595"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-sm tracking-wide transition-opacity hover:opacity-85"
            style={{ background: '#c9a84c', color: '#0a0a0f', fontFamily: 'var(--font-mono, monospace)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Download on the App Store
          </a>
        </div>

        {/* Footer */}
        <footer
          className="text-center py-6 text-xs tracking-widest"
          style={{ borderTop: '1px solid rgba(201,168,76,0.1)', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono, monospace)' }}
        >
          <Link href="/privacy" className="hover:opacity-60 transition-opacity" style={{ color: 'rgba(201,168,76,0.4)' }}>
            Privacy Policy
          </Link>
        </footer>
      </div>
    );
  }

  // ── Checking auth / loading dashboard ────────────────────────────
  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span
          className="text-[11px] tracking-[2px] uppercase"
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            color: '#9aa0a6',
          }}
        >
          Loading…
        </span>
      </div>
    );
  }

  const dp = getDailyPrompt();
  const counselorInfo = COUNSELOR_META[dp.counselorSlug] ?? {
    name: dp.counselorName,
    initials: dp.counselorName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
  };
  const questionUrl = `/cabinet?q=${encodeURIComponent(dp.prompt)}&counselor=${dp.counselorSlug}`;
  const firstName = userName.split(' ')[0];
  const quote = DAILY_QUOTES[new Date().getDay() % DAILY_QUOTES.length];

  return (
    <div className="min-h-screen pb-8">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-2 flex justify-between items-start">
        <div>
          <div
            className="text-[13px] italic tracking-wide"
            style={{
              fontFamily: 'var(--font-serif, Georgia, serif)',
              color: '#c9a84c',
            }}
          >
            {getDayOfWeek()} · {getMonthDay()}
          </div>
          <h1
            className="text-[32px] font-medium leading-none tracking-tight mt-1"
            style={{
              fontFamily: 'var(--font-serif, Georgia, serif)',
              color: '#e6eef8',
            }}
          >
            Good {getTimeOfDay()},<br />
            <em style={{ color: '#c9a84c' }}>{firstName}.</em>
          </h1>
        </div>

        {/* Quick-link pills */}
        <div className="flex gap-2 mt-2">
          <Link
            href="/morning"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all"
            style={
              morningDone
                ? { background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c', fontFamily: 'var(--font-mono, monospace)' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9aa0a6', fontFamily: 'var(--font-mono, monospace)' }
            }
          >
            ☀️{morningDone ? ' ✓' : ''}
          </Link>
          <Link
            href="/evening"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all"
            style={
              eveningDone
                ? { background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c', fontFamily: 'var(--font-mono, monospace)' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9aa0a6', fontFamily: 'var(--font-mono, monospace)' }
            }
          >
            🌙{eveningDone ? ' ✓' : ''}
          </Link>
        </div>
      </div>

      {/* Gold rule */}
      <div
        className="h-px mx-5 mt-4"
        style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.4), transparent)' }}
      />

      {/* ── Future Self Onboarding Banner ────────────────────────── */}
      {showOnboardingBanner && (
        <div className="px-4 pt-4">
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.06))',
              border: '1px solid rgba(201,168,76,0.35)',
            }}
          >
            {/* Icon */}
            <div
              className="rounded-full flex-shrink-0 flex items-center justify-center text-lg"
              style={{ width: 44, height: 44, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}
            >
              ✦
            </div>

            <div className="flex-1 min-w-0">
              <div
                className="text-[9.5px] tracking-[1.6px] uppercase"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
              >
                Personalise Your App
              </div>
              <div
                className="text-[15px] leading-snug mt-0.5"
                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
              >
                Meet Your Future Self
              </div>
            </div>

            {/* Begin CTA */}
            <Link
              href="/onboarding"
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] tracking-[1.2px] uppercase font-semibold"
              style={{
                background: 'linear-gradient(135deg, #e3c77a, #8a6f27)',
                color: '#0f1724',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              Begin
            </Link>

            {/* Dismiss */}
            <button
              onClick={() => {
                sessionStorage.setItem('arete_onboarding_banner_dismissed', '1');
                setShowOnboardingBanner(false);
              }}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs"
              style={{ color: '#9aa0a6', background: 'rgba(255,255,255,0.05)' }}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Streak Row ────────────────────────────────────────────── */}
      <div className="px-5 py-5 flex gap-4 items-center">
        <StreakArc day={streak} />
        <div className="flex-1">
          <div
            className="text-[9.5px] tracking-[1.6px] uppercase"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
          >
            Day {toRoman(streak)} of C
          </div>
          <div
            className="text-[19px] mt-1 leading-snug tracking-tight"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
          >
            {streak <= 0
              ? 'Begin today.'
              : streak === 1
              ? 'One morning.'
              : `${numberToWords(streak)} mornings in a row.`}
          </div>
          <div
            className="italic text-[13px] mt-1"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
          >
            &ldquo;The chain is heavier than it looks.&rdquo;
          </div>
        </div>
      </div>

      {/* Gold rule */}
      <div
        className="h-px mx-5"
        style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.4), transparent)' }}
      />

      {/* ── Today's Question ──────────────────────────────────────── */}
      <div className="px-4 py-4">
        <Link href={questionUrl}>
          <GlassCard accent>
            <div className="p-4 flex gap-3 items-center">
              {/* Counselor bust */}
              <div
                className="rounded-full flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 52, height: 52,
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#c9a84c',
                }}
              >
                {counselorInfo.initials}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className="text-[9.5px] tracking-[1.6px] uppercase"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                >
                  {counselorInfo.name} asks
                </div>
                <div
                  className="italic text-[17px] leading-snug mt-1 tracking-tight line-clamp-2"
                  style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                >
                  &ldquo;{dp.prompt}&rdquo;
                </div>
              </div>

              {/* Arrow / check */}
              {dailyQuestion?.response ? (
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

            {/* Saved response preview */}
            {dailyQuestion?.response && (
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
                  &ldquo;{dailyQuestion.response}&rdquo;
                </p>
              </div>
            )}
          </GlassCard>
        </Link>
      </div>

      {/* ── Daily Quote ───────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <div
          className="rounded-xl p-4"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderLeft: '3px solid rgba(201,168,76,0.5)',
          }}
        >
          <p
            className="italic text-[15px] opacity-90 leading-relaxed"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
          >
            &ldquo;{quote.text}&rdquo;
          </p>
          <p
            className="text-[9.5px] tracking-[1.4px] uppercase mt-2"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
          >
            {quote.author}
          </p>
        </div>
      </div>

      {/* ── Know Thyself nudge ────────────────────────────────────── */}
      {knowThyselfIncomplete && (
        <div className="px-4 pb-4">
          <GlassCard>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-arete-gold">👤</span>
                <span
                  className="text-[10px] tracking-[1.6px] uppercase"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                >
                  Complete Your Profile
                </span>
              </div>
              <p
                className="text-[14px] leading-relaxed mb-3"
                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
              >
                The Cabinet&apos;s responses are generic until you tell them who you are. It takes 2 minutes.
              </p>
              <Link
                href="/profile"
                className="text-[10px] tracking-[1.4px] uppercase hover:underline"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
              >
                Complete Now →
              </Link>
            </div>
          </GlassCard>
        </div>
      )}

    </div>
  );
}
