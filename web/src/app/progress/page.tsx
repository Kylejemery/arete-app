'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSettings, hasCheckInToday, getReadingData, getCalendarData, getJournalEntries } from '@/lib/db';
import PageHeader from '@/components/PageHeader';

type Tab = 'overview' | 'reading';

interface ReadingSession {
  bookTitle: string;
  pagesRead: number;
  duration: number;
  dateFormatted: string;
}

interface Book {
  title: string;
  author: string;
  dateFinished?: string;
  currentPage?: number;
}

interface CalendarData {
  [dateKey: string]: { morning: boolean; evening: boolean };
}

export default function ProgressPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');

  const [streak, setStreak] = useState(0);
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [journalCount, setJournalCount] = useState(0);
  const [quoteCount, setQuoteCount] = useState(0);
  const [beliefCounts, setBeliefCounts] = useState({ inProgress: 0, encoded: 0 });

  // Reading
  const [booksRead, setBooksRead] = useState<Book[]>([]);
  const [currentBooks, setCurrentBooks] = useState<Book[]>([]);
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  const [readingStreak, setReadingStreak] = useState(0);

  useEffect(() => {
    async function load() {
      const [settings, morningDoneToday, eveningDoneToday, readingData, calData, journalEntries] = await Promise.all([
        getUserSettings(),
        hasCheckInToday('morning'),
        hasCheckInToday('evening'),
        getReadingData(),
        getCalendarData(),
        getJournalEntries(),
      ]);
      if (!settings?.user_name) { router.replace('/login'); return; }

      setStreak(0);

      setJournalCount(journalEntries.length);
      setQuoteCount(journalEntries.filter(e => e.type === 'quote').length);

      const beliefs = journalEntries.filter(e => e.type === 'belief');
      setBeliefCounts({
        encoded: beliefs.filter(b => b.belief_stage === 'encoded').length,
        inProgress: beliefs.filter(b => b.belief_stage !== 'encoded').length,
      });

      setBooksRead(readingData?.books_read || []);
      setCurrentBooks(readingData?.current_books || []);
      setReadingSessions(readingData?.reading_sessions || []);
      setReadingStreak(0);

      // Merge today's check-in status into calendar data
      const todayKey = new Date().toDateString();
      const mergedCalData = {
        ...calData,
        [todayKey]: { morning: morningDoneToday, evening: eveningDoneToday },
      };
      setCalendarData(mergedCalData as CalendarData);
    }
    load();
  }, [router]);

  const getMilestone = (s: number) => {
    if (s >= 365) return '🏆 365 Day Warrior';
    if (s >= 100) return '💎 Century';
    if (s >= 60) return '🔥 Two Months';
    if (s >= 30) return '⚡ One Month';
    if (s >= 7) return '✨ One Week';
    return null;
  };

  // Weekly calendar (last 7 days)
  const getWeekDays = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const data = calendarData[key];
      days.push({ key, label, morning: data?.morning ?? false, evening: data?.evening ?? false });
    }
    return days;
  };

  const weekDays = getWeekDays();
  const milestone = getMilestone(streak);

  const totalReadingMinutes = readingSessions.reduce((sum, s) => sum + Math.floor(s.duration / 60), 0);
  const totalPagesRead = readingSessions.reduce((sum, s) => sum + s.pagesRead, 0);

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      <PageHeader title="Progress" subtitle="Track your discipline" />

      {/* Tabs */}
      <div className="flex border-b border-arete-border mb-6">
        {(['overview', 'reading'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'text-arete-gold border-arete-gold' : 'text-arete-muted border-transparent hover:text-arete-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          {/* Streak */}
          <div className="bg-arete-surface rounded-lg border border-arete-border p-6 mb-4 text-center">
            <p className="text-arete-muted text-sm mb-1">Current Streak</p>
            <p className="text-6xl font-bold text-arete-gold">{streak}</p>
            <p className="text-arete-text mt-1">days</p>
            {milestone && <p className="text-arete-gold font-semibold mt-2">{milestone}</p>}

            {/* Next milestone */}
            {!milestone || streak < 365 ? (
              <p className="text-arete-muted text-xs mt-2">
                {streak < 7 ? `${7 - streak} days to 7-day milestone` :
                 streak < 30 ? `${30 - streak} days to 30-day milestone` :
                 streak < 60 ? `${60 - streak} days to 60-day milestone` :
                 streak < 100 ? `${100 - streak} days to century milestone` :
                 `${365 - streak} days to 365-day milestone`}
              </p>
            ) : null}
          </div>

          {/* Weekly Activity */}
          <div className="bg-arete-surface rounded-lg border border-arete-border p-4 mb-4">
            <h3 className="text-arete-gold font-semibold mb-3">This Week</h3>
            <div className="flex gap-1 justify-between">
              {weekDays.map(day => (
                <div key={day.key} className="flex flex-col items-center gap-1 flex-1">
                  <p className="text-arete-muted text-xs">{day.label}</p>
                  <div className={`w-8 h-4 rounded-sm ${day.morning ? 'bg-arete-gold' : 'bg-arete-border'}`} title="Morning" />
                  <div className={`w-8 h-4 rounded-sm ${day.evening ? 'bg-arete-gold opacity-70' : 'bg-arete-border'}`} title="Evening" />
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2">
              <span className="text-arete-muted text-xs flex items-center gap-1"><span className="w-3 h-3 bg-arete-gold rounded-sm inline-block" /> Morning</span>
              <span className="text-arete-muted text-xs flex items-center gap-1"><span className="w-3 h-3 bg-arete-gold opacity-70 rounded-sm inline-block" /> Evening</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Journal Entries', value: journalCount, emoji: '📖' },
              { label: 'Quotes Saved', value: quoteCount, emoji: '💬' },
              { label: 'Beliefs Encoded', value: beliefCounts.encoded, emoji: '⚡' },
              { label: 'Beliefs In Progress', value: beliefCounts.inProgress, emoji: '🔍' },
            ].map(stat => (
              <div key={stat.label} className="bg-arete-surface rounded-lg border border-arete-border p-4 text-center">
                <p className="text-2xl mb-1">{stat.emoji}</p>
                <p className="text-arete-gold text-2xl font-bold">{stat.value}</p>
                <p className="text-arete-muted text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Milestone Badges */}
          <div className="bg-arete-surface rounded-lg border border-arete-border p-4">
            <h3 className="text-arete-gold font-semibold mb-3">Milestones</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { days: 7, label: '7 Days', emoji: '✨' },
                { days: 30, label: '30 Days', emoji: '⚡' },
                { days: 60, label: '60 Days', emoji: '🔥' },
                { days: 100, label: '100 Days', emoji: '💎' },
                { days: 365, label: '365 Days', emoji: '🏆' },
              ].map(m => (
                <div key={m.days} className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${streak >= m.days ? 'bg-arete-gold text-arete-bg' : 'bg-arete-border text-arete-muted'}`}>
                  {m.emoji} {m.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'reading' && (
        <div>
          {/* Reading Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-arete-surface rounded-lg border border-arete-border p-4 text-center">
              <p className="text-arete-gold text-3xl font-bold">{booksRead.length}</p>
              <p className="text-arete-muted text-xs mt-1">Books Finished</p>
            </div>
            <div className="bg-arete-surface rounded-lg border border-arete-border p-4 text-center">
              <p className="text-arete-gold text-3xl font-bold">{readingStreak}</p>
              <p className="text-arete-muted text-xs mt-1">Reading Streak</p>
            </div>
            <div className="bg-arete-surface rounded-lg border border-arete-border p-4 text-center">
              <p className="text-arete-gold text-3xl font-bold">{totalPagesRead}</p>
              <p className="text-arete-muted text-xs mt-1">Pages Read</p>
            </div>
            <div className="bg-arete-surface rounded-lg border border-arete-border p-4 text-center">
              <p className="text-arete-gold text-3xl font-bold">{Math.floor(totalReadingMinutes / 60)}h {totalReadingMinutes % 60}m</p>
              <p className="text-arete-muted text-xs mt-1">Total Reading Time</p>
            </div>
          </div>

          {/* Currently Reading */}
          {currentBooks.length > 0 && (
            <div className="bg-arete-surface rounded-lg border border-arete-border p-4 mb-4">
              <h3 className="text-arete-gold font-semibold mb-3">Currently Reading</h3>
              <div className="space-y-2">
                {currentBooks.map((book, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-arete-text text-sm font-medium">{book.title}</p>
                      <p className="text-arete-muted text-xs">by {book.author}</p>
                    </div>
                    <p className="text-arete-gold text-sm">p. {book.currentPage || 0}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Books Read */}
          {booksRead.length > 0 && (
            <div className="bg-arete-surface rounded-lg border border-arete-border p-4 mb-4">
              <h3 className="text-arete-gold font-semibold mb-3">Books Finished</h3>
              <div className="space-y-2">
                {booksRead.map((book, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-arete-text text-sm font-medium">{book.title}</p>
                      <p className="text-arete-muted text-xs">by {book.author}</p>
                    </div>
                    {book.dateFinished && <p className="text-arete-muted text-xs">{book.dateFinished}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Reading Sessions */}
          {readingSessions.length > 0 && (
            <div className="bg-arete-surface rounded-lg border border-arete-border p-4">
              <h3 className="text-arete-gold font-semibold mb-3">Recent Sessions</h3>
              <div className="space-y-2">
                {readingSessions.slice(-10).reverse().map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-arete-text font-medium">{s.bookTitle}</p>
                      <p className="text-arete-muted text-xs">{s.dateFormatted}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-arete-gold font-semibold">{s.pagesRead} pages</p>
                      <p className="text-arete-muted text-xs">{Math.floor(s.duration / 60)} min</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {booksRead.length === 0 && currentBooks.length === 0 && readingSessions.length === 0 && (
            <p className="text-arete-muted text-sm text-center py-8">No reading data yet. Start tracking in the Focus tab.</p>
          )}
        </div>
      )}
    </div>
  );
}
