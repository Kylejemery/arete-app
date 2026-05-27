'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getUserSettings,
  hasCheckInToday,
  getProfileStreak,
  getDailyQuestionCache,
  upsertTodayCheckin,
} from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { DAILY_QUOTES, getDailyPrompt } from '@/lib/quotes';
import GlassCard from '@/components/GlassCard';
import StreakArc from '@/components/StreakArc';

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
  const [userName, setUserName] = useState('');
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [knowThyselfIncomplete, setKnowThyselfIncomplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [dailyQuestion, setDailyQuestion] = useState<{ counselorSlug: string; response: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?redirectTo=/');
        return;
      }
      const [settings, morningDoneToday, eveningDoneToday, streakVal, dqCache] = await Promise.all([
        getUserSettings(),
        hasCheckInToday('morning'),
        hasCheckInToday('evening'),
        getProfileStreak(),
        getDailyQuestionCache(),
      ]);
      if (!settings?.user_name) {
        router.replace('/setup');
        return;
      }
      setUserName(settings.user_name);
      setKnowThyselfIncomplete(!settings.kt_goals || settings.kt_goals.trim().length === 0);
      setMorningDone(morningDoneToday);
      setEveningDone(eveningDoneToday);
      setStreak(streakVal);

      // Save today's counselor slug so mobile can verify cache validity
      if (!dqCache) {
        const dp = getDailyPrompt();
        upsertTodayCheckin({ daily_question_counselor: dp.counselorSlug }).catch(() => {});
      }
      setDailyQuestion(dqCache);
      setLoaded(true);
    }
    load();
  }, [router]);

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
