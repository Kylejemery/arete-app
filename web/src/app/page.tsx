'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserSettings, getTodayCheckin } from '@/lib/db';
import { DAILY_QUOTES } from '@/lib/quotes';

export default function HomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [knowThyselfIncomplete, setKnowThyselfIncomplete] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const [settings, checkin] = await Promise.all([getUserSettings(), getTodayCheckin()]);
      if (!settings?.user_name) {
        router.replace('/login');
        return;
      }
      setUserName(settings.user_name);
      setKnowThyselfIncomplete(!settings.kt_goals || settings.kt_goals.trim().length === 0);
      setMorningDone(checkin?.morning_done === true);
      setEveningDone(checkin?.evening_done === true);
      setStreak(checkin?.streak ?? 0);
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

  const getDailyQuote = () => {
    return DAILY_QUOTES[new Date().getDay() % DAILY_QUOTES.length];
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-arete-bg flex items-center justify-center">
        <div className="text-arete-muted">Loading...</div>
      </div>
    );
  }

  const greeting = getGreeting();
  const quote = getDailyQuote();

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-arete-muted text-lg">{greeting.salutation}</p>
        <p className="text-arete-gold text-sm italic">{greeting.subtitle}</p>
        <h2 className="text-3xl font-bold text-arete-text mt-1">{userName} ⚔️</h2>
      </div>

      {/* Daily Quote */}
      <div className="bg-arete-surface rounded-lg border-l-4 border-arete-gold p-5 mb-6 flex gap-3">
        <span className="text-arete-gold text-xl flex-shrink-0">🔥</span>
        <div>
          <p className="text-arete-gold italic text-sm leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
          <p className="text-arete-muted text-xs italic mt-2">— {quote.author}</p>
        </div>
      </div>

      {/* Streak */}
      <div className="bg-arete-surface rounded-lg border border-arete-border p-5 mb-6 flex items-center gap-4">
        <span className="text-3xl">🏆</span>
        <div>
          <span className="text-arete-gold text-4xl font-bold">{streak}</span>
          <span className="text-arete-text text-lg ml-2">Days of Discipline 🕯️</span>
        </div>
      </div>

      {/* Know Thyself Nudge */}
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

      {/* Today's Disciplines */}
      <Link href="/progress">
        <h3 className="text-arete-text font-bold text-lg mb-4 hover:text-arete-gold transition-colors">Today&apos;s Disciplines</h3>
      </Link>
      <div className="space-y-3 mb-8">
        <Link href="/morning" className={`flex items-center gap-3 rounded-lg p-4 border transition-colors ${morningDone ? 'bg-arete-gold border-arete-gold' : 'bg-arete-surface border-arete-border hover:border-arete-gold'}`}>
          <span className="text-2xl">☀️</span>
          <span className={`flex-1 font-medium ${morningDone ? 'text-arete-bg' : 'text-arete-text'}`}>Morning Routine</span>
          {morningDone && <span className="text-arete-bg font-bold">✓</span>}
        </Link>
        <Link href="/evening" className={`flex items-center gap-3 rounded-lg p-4 border transition-colors ${eveningDone ? 'bg-arete-gold border-arete-gold' : 'bg-arete-surface border-arete-border hover:border-arete-gold'}`}>
          <span className="text-2xl">🌙</span>
          <span className={`flex-1 font-medium ${eveningDone ? 'text-arete-bg' : 'text-arete-text'}`}>Evening Routine</span>
          {eveningDone && <span className="text-arete-bg font-bold">✓</span>}
        </Link>
      </div>

      {/* Quick Actions */}
      <h3 className="text-arete-text font-bold text-lg mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { href: '/cabinet', emoji: '🎙️', label: 'Cabinet' },
          { href: '/focus', emoji: '⏱️', label: 'Focus' },
          { href: '/journal', emoji: '📖', label: 'Journal' },
          { href: '/progress', emoji: '🏆', label: 'Progress' },
          { href: '/profile', emoji: '👤', label: 'Know Thyself' },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-arete-surface rounded-lg border border-arete-border p-5 flex flex-col items-center gap-2 hover:border-arete-gold transition-colors"
          >
            <span className="text-2xl">{action.emoji}</span>
            <span className="text-arete-text text-sm font-semibold">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
