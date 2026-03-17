'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSettings, getReadingData, upsertReadingData } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/PageHeader';

interface Book {
  id: string;
  title: string;
  author: string;
  currentPage: number;
}

interface ReadingSession {
  id: string;
  bookTitle: string;
  startPage: number;
  endPage: number;
  pagesRead: number;
  duration: number; // seconds
  date: string;
  dateFormatted: string;
}

export default function FocusPage() {
  const router = useRouter();

  // Pomodoro timer
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reading tracker
  const [currentBooks, setCurrentBooks] = useState<Book[]>([]);
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  const [showAddBook, setShowAddBook] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [showLogSession, setShowLogSession] = useState(false);
  const [logBookId, setLogBookId] = useState('');
  const [logStartPage, setLogStartPage] = useState('');
  const [logEndPage, setLogEndPage] = useState('');
  const [logMinutes, setLogMinutes] = useState('');
  const [readingTimerRunning, setReadingTimerRunning] = useState(false);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const readingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return; }
      const [settings, readingData] = await Promise.all([getUserSettings(), getReadingData()]);
      if (!settings?.user_name) { router.replace('/setup'); return; }

      setCurrentBooks((readingData?.current_books || []) as Book[]);
      setReadingSessions((readingData?.reading_sessions || []) as ReadingSession[]);
    }
    load();
  }, [router]);

  // Pomodoro timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            if (mode === 'work') {
              setSessions(s => s + 1);
              setMode('break');
              return 5 * 60;
            } else {
              setMode('work');
              return 25 * 60;
            }
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, mode]);

  // Reading timer logic
  useEffect(() => {
    if (readingTimerRunning) {
      readingTimerRef.current = setInterval(() => {
        setReadingSeconds(s => s + 1);
      }, 1000);
    } else {
      if (readingTimerRef.current) clearInterval(readingTimerRef.current);
    }
    return () => { if (readingTimerRef.current) clearInterval(readingTimerRef.current); };
  }, [readingTimerRunning]);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const addBook = async () => {
    if (!newTitle.trim()) return;
    const book: Book = { id: Date.now().toString(), title: newTitle.trim(), author: newAuthor.trim() || 'Unknown', currentPage: 0 };
    const updated = [...currentBooks, book];
    setCurrentBooks(updated);
    await upsertReadingData({ current_books: updated });
    setNewTitle(''); setNewAuthor('');
    setShowAddBook(false);
  };

  const removeBook = async (id: string) => {
    const updated = currentBooks.filter(b => b.id !== id);
    setCurrentBooks(updated);
    await upsertReadingData({ current_books: updated });
  };

  const finishBook = async (id: string) => {
    const book = currentBooks.find(b => b.id === id);
    if (!book) return;
    const data = await getReadingData();
    const booksRead = data?.books_read || [];
    booksRead.push({ ...book, dateFinished: new Date().toLocaleDateString() });
    const updatedBooks = currentBooks.filter(b => b.id !== id);
    setCurrentBooks(updatedBooks);
    await upsertReadingData({ current_books: updatedBooks, books_read: booksRead });
  };

  const logSession = async () => {
    const book = currentBooks.find(b => b.id === logBookId);
    if (!book || !logStartPage || !logEndPage) return;
    const pagesRead = Math.max(0, parseInt(logEndPage) - parseInt(logStartPage));
    const duration = parseInt(logMinutes) * 60 || readingSeconds;
    const session: ReadingSession = {
      id: Date.now().toString(),
      bookTitle: book.title,
      startPage: parseInt(logStartPage),
      endPage: parseInt(logEndPage),
      pagesRead,
      duration,
      date: new Date().toISOString(),
      dateFormatted: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    const updatedSessions = [...readingSessions, session];
    setReadingSessions(updatedSessions);

    const updatedBooks = currentBooks.map(b => b.id === logBookId ? { ...b, currentPage: parseInt(logEndPage) } : b);
    setCurrentBooks(updatedBooks);

    await upsertReadingData({ reading_sessions: updatedSessions, current_books: updatedBooks });

    setLogBookId(''); setLogStartPage(''); setLogEndPage(''); setLogMinutes('');
    setReadingSeconds(0); setReadingTimerRunning(false);
    setShowLogSession(false);
  };

  const inputClass = "bg-arete-bg border border-arete-border rounded-lg px-3 py-2 text-arete-text focus:border-arete-gold focus:outline-none w-full text-sm";

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      <PageHeader title="Focus" subtitle="Deep work and reading" />

      {/* Pomodoro Timer */}
      <div className="bg-arete-surface rounded-lg border border-arete-border p-6 mb-6 text-center">
        <div className="flex gap-4 justify-center mb-4">
          {(['work', 'break'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setTimeLeft(m === 'work' ? 25 * 60 : 5 * 60); setIsRunning(false); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-arete-gold text-arete-bg' : 'text-arete-muted hover:text-arete-text'}`}
            >
              {m === 'work' ? '25 min Work' : '5 min Break'}
            </button>
          ))}
        </div>

        <div className="text-7xl font-mono font-bold text-arete-gold mb-6">
          {formatTime(timeLeft)}
        </div>

        <div className="flex gap-3 justify-center mb-4">
          <button
            onClick={() => setIsRunning(r => !r)}
            className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-8 py-3 hover:opacity-90 text-lg"
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={resetTimer}
            className="border border-arete-border text-arete-muted rounded-lg px-6 py-3 hover:border-arete-gold hover:text-arete-text transition-colors"
          >
            Reset
          </button>
        </div>

        <p className="text-arete-muted text-sm">Sessions completed today: <span className="text-arete-gold font-semibold">{sessions}</span></p>
      </div>

      {/* Reading Tracker */}
      <div className="bg-arete-surface rounded-lg border border-arete-border p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-arete-gold font-semibold">Reading Timer</h3>
          <div className="flex gap-2 items-center">
            <span className="text-arete-text font-mono text-lg">{formatTime(readingSeconds)}</span>
            <button
              onClick={() => setReadingTimerRunning(r => !r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${readingTimerRunning ? 'bg-red-600 text-white' : 'bg-arete-gold text-arete-bg hover:opacity-90'}`}
            >
              {readingTimerRunning ? 'Stop' : 'Start'}
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <h4 className="text-arete-text font-medium text-sm">Currently Reading</h4>
          <button onClick={() => setShowAddBook(s => !s)} className="text-arete-gold text-xs hover:underline">+ Add Book</button>
        </div>

        {showAddBook && (
          <div className="space-y-2 mb-3">
            <input className={inputClass} placeholder="Book title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus />
            <input className={inputClass} placeholder="Author..." value={newAuthor} onChange={e => setNewAuthor(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => setShowAddBook(false)} className="text-arete-muted text-sm hover:text-arete-text">Cancel</button>
              <button onClick={addBook} className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-1.5 hover:opacity-90 text-sm">Add</button>
            </div>
          </div>
        )}

        {currentBooks.length === 0 ? (
          <p className="text-arete-muted text-sm">No books in progress. Add one to track your reading.</p>
        ) : (
          <div className="space-y-2">
            {currentBooks.map(book => (
              <div key={book.id} className="flex items-center gap-2 rounded-lg border border-arete-border p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-arete-text text-sm font-medium truncate">{book.title}</p>
                  <p className="text-arete-muted text-xs">by {book.author} · page {book.currentPage}</p>
                </div>
                <button onClick={() => finishBook(book.id)} className="text-arete-gold text-xs hover:underline flex-shrink-0">Finished</button>
                <button onClick={() => removeBook(book.id)} className="text-arete-muted text-xs hover:text-red-400 flex-shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}

        {currentBooks.length > 0 && (
          <button
            onClick={() => setShowLogSession(s => !s)}
            className="mt-3 w-full border border-arete-gold text-arete-gold rounded-lg px-4 py-2 hover:bg-arete-gold hover:text-arete-bg transition-colors text-sm font-semibold"
          >
            Log Reading Session
          </button>
        )}

        {showLogSession && (
          <div className="mt-3 space-y-2">
            <select className={inputClass} value={logBookId} onChange={e => setLogBookId(e.target.value)}>
              <option value="">Select book...</option>
              {currentBooks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <div className="flex gap-2">
              <input className={inputClass} placeholder="Start page" type="number" value={logStartPage} onChange={e => setLogStartPage(e.target.value)} />
              <input className={inputClass} placeholder="End page" type="number" value={logEndPage} onChange={e => setLogEndPage(e.target.value)} />
            </div>
            <input className={inputClass} placeholder={`Minutes (or use timer: ${formatTime(readingSeconds)})`} type="number" value={logMinutes} onChange={e => setLogMinutes(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => setShowLogSession(false)} className="text-arete-muted text-sm hover:text-arete-text">Cancel</button>
              <button onClick={logSession} className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-1.5 hover:opacity-90 text-sm">Log Session</button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      {readingSessions.length > 0 && (
        <div className="bg-arete-surface rounded-lg border border-arete-border p-4">
          <h3 className="text-arete-gold font-semibold mb-3">Recent Sessions</h3>
          <div className="space-y-2">
            {readingSessions.slice(-5).reverse().map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-arete-text font-medium">{s.bookTitle}</p>
                  <p className="text-arete-muted text-xs">{s.dateFormatted} · pp. {s.startPage}–{s.endPage}</p>
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
    </div>
  );
}
