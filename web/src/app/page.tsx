'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserSettings, hasCheckInToday, getProfileStreak } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { DAILY_QUOTES } from '@/lib/quotes';

const COUNSELOR_NAMES: Record<string, string> = {
  'marcus-aurelius': 'Marcus Aurelius',
  'marcus': 'Marcus Aurelius',
  'epictetus': 'Epictetus',
  'seneca': 'Seneca',
  'david-goggins': 'David Goggins',
  'goggins': 'David Goggins',
  'theodore-roosevelt': 'Theodore Roosevelt',
  'futureSelf': 'Future Self',
};

type TimeSlot = 'morning' | 'midday' | 'evening';

function getTimeSlot(): TimeSlot {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'midday';
  return 'evening';
}

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
      const [settings, morningDoneToday, eveningDoneToday, streakVal] = await Promise.all([
        getUserSettings(),
        hasCheckInToday('morning'),
        hasCheckInToday('evening'),
        getProfileStreak(),
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
      setDailyQuestion(null);
      setLoaded(true);
    }
    load();
  }, [router]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { salutation: 'Good morning,', subtitle: 'Rise and pursue virtue' };
    if (hour < 18) return { salutation: 'Keep going,', subtitle: 'Continue with excellence' };
    return { salutation: 'Good evening,', subtitle: 'Reflect on this day' };
  };

  const getDailyQuote = () => DAILY_QUOTES[new Date().getDay() % DAILY_QUOTES.length];

  if (!loaded) {
    return (
      <div className="min-h-screen bg-arete-bg flex items-center justify-center">
        <div className="text-arete-muted">Loading...</div>
      </div>
    );
  }

  const greeting = getGreeting();
  const quote = getDailyQuote();
  const timeSlot = getTimeSlot();

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">

      {/* Greeting */}
      <div className="mb-6">
        <p className="text-arete-muted text-lg">{greeting.salutation}</p>
        <p className="text-arete-gold text-sm italic">{greeting.subtitle}</p>
        <h2 className="text-3xl font-bold text-arete-text mt-1">{userName} ⚔️</h2>
      </div>

      {/* Morning / Cabinet / Evening pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link
          href="/morning"
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
          style={
            timeSlot === 'morning'
              ? { background: '#c9a84c', color: '#1a1a2e' }
              : morningDone
              ? { background: 'rgba(201,168,76,0.15)', border: '1.5px solid #c9a84c', color: '#c9a84c' }
              : { background: 'transparent', border: '1.5px solid #2a3a5c', color: '#9aa0a6' }
          }
        >
          <span>☀️</span>
          <span>Morning</span>
          {morningDone && <span className="text-xs">✓</span>}
        </Link>
        <Link
          href="/cabinet"
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
          style={
            timeSlot === 'midday'
              ? { background: '#c9a84c', color: '#1a1a2e' }
              : { background: 'transparent', border: '1.5px solid #2a3a5c', color: '#9aa0a6' }
          }
        >
          <span>🎙️</span>
          <span>Cabinet</span>
        </Link>
        <Link
          href="/evening"
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all"
          style={
            timeSlot === 'evening'
              ? { background: '#c9a84c', color: '#1a1a2e' }
              : eveningDone
              ? { background: 'rgba(201,168,76,0.15)', border: '1.5px solid #c9a84c', color: '#c9a84c' }
              : { background: 'transparent', border: '1.5px solid #2a3a5c', color: '#9aa0a6' }
          }
        >
          <span>🌙</span>
          <span>Evening</span>
          {eveningDone && <span className="text-xs">✓</span>}
        </Link>
      </div>

      {/* Streak */}
      <div className="bg-arete-surface rounded-lg border border-arete-border p-5 mb-6 flex items-center gap-5">
        <span className="text-4xl leading-none">🔥</span>
        <div>
          <p className="text-arete-gold text-4xl font-bold leading-none">{streak}</p>
          <p className="text-arete-text font-semibold text-sm mt-1">Days of Discipline</p>
          <p className="text-arete-muted text-xs mt-0.5">Keep the chain unbroken</p>
        </div>
      </div>

      {/* Daily Quote */}
      <div className="bg-arete-surface rounded-lg border-l-4 border-arete-gold p-5 mb-6">
        <p className="text-arete-gold italic text-sm leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
        <p className="text-arete-muted text-xs italic mt-2">— {quote.author}</p>
      </div>

      {/* Today's Question (if cached from mobile) */}
      {dailyQuestion && (
        <Link href="/cabinet" className="block mb-6">
          <div className="bg-arete-surface rounded-lg border border-arete-border p-5 hover:border-arete-gold transition-colors">
            <p className="text-arete-gold font-semibold text-xs uppercase tracking-wider mb-2">
              Today&apos;s Question
            </p>
            <p className="text-arete-text text-sm leading-relaxed line-clamp-4">
              {dailyQuestion.response}
            </p>
            <p className="text-arete-muted text-xs italic mt-3">
              — {COUNSELOR_NAMES[dailyQuestion.counselorSlug] ?? dailyQuestion.counselorSlug}
            </p>
            <p className="text-arete-gold text-xs mt-2 font-medium">Open in Cabinet →</p>
          </div>
        </Link>
      )}

      {/* Know Thyself nudge */}
      {knowThyselfIncomplete && (
        <div className="bg-arete-surface rounded-lg border border-arete-gold p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span>👤</span>
            <span className="text-arete-gold font-semibold">Complete Your Profile</span>
          </div>
          <p className="text-arete-muted text-sm mb-3">
            The Cabinet&apos;s responses are generic until you tell them who you are. It takes 2 minutes.
          </p>
          <Link href="/profile" className="text-arete-gold text-sm font-semibold hover:underline">
            Complete Now →
          </Link>
        </div>
      )}

    </div>
  );
}
