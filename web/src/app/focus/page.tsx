'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSettings, getReadingData, upsertReadingData } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import TimerOrbit from '@/components/TimerOrbit';
import GlassCard from '@/components/GlassCard';
import ChapterRule from '@/components/ChapterRule';

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
  duration: number;
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
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showAddBook, setShowAddBook] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [isReadingRunning, setIsReadingRunning] = useState(false);
  const [isReadingPaused, setIsReadingPaused] = useState(false);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const [sessionStartPage, setSessionStartPage] = useState(0);
  const [showStartConfig, setShowStartConfig] = useState(false);
  const [startPageInput, setStartPageInput] = useState('');
  const [showEndPageInput, setShowEndPageInput] = useState(false);
  const [endPageInput, setEndPageInput] = useState('');
  const readingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
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
    if (isReadingRunning && !isReadingPaused) {
      readingTimerRef.current = setInterval(() => {
        setReadingSeconds(s => s + 1);
      }, 1000);
    } else {
      if (readingTimerRef.current) clearInterval(readingTimerRef.current);
    }
    return () => { if (readingTimerRef.current) clearInterval(readingTimerRef.current); };
  }, [isReadingRunning, isReadingPaused]);

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

  const handleReadingStart = () => {
    if (!selectedBook) return;
    setStartPageInput(selectedBook.currentPage ? String(selectedBook.currentPage) : '');
    setShowStartConfig(true);
  };

  const confirmReadingStart = () => {
    const page = parseInt(startPageInput);
    if (!page || page <= 0) return;
    setSessionStartPage(page);
    setShowStartConfig(false);
    setReadingSeconds(0);
    setIsReadingRunning(true);
    setIsReadingPaused(false);
  };

  const handleReadingStop = () => {
    setIsReadingRunning(false);
    setIsReadingPaused(false);
    setShowEndPageInput(true);
  };

  const saveReadingSession = async () => {
    const endPage = parseInt(endPageInput);
    if (!endPage || endPage <= 0 || !selectedBook) return;
    const pagesRead = Math.max(0, endPage - sessionStartPage);
    const session: ReadingSession = {
      id: Date.now().toString(),
      bookTitle: selectedBook.title,
      startPage: sessionStartPage,
      endPage,
      pagesRead,
      duration: readingSeconds,
      date: new Date().toISOString(),
      dateFormatted: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    const updatedSessions = [...readingSessions, session];
    setReadingSessions(updatedSessions);
    const updatedBooks = currentBooks.map(b =>
      b.id === selectedBook.id ? { ...b, currentPage: endPage } : b
    );
    setCurrentBooks(updatedBooks);
    setSelectedBook({ ...selectedBook, currentPage: endPage });
    await upsertReadingData({ reading_sessions: updatedSessions, current_books: updatedBooks });
    setReadingSeconds(0);
    setEndPageInput('');
    setShowEndPageInput(false);
  };

  const pomodoroTotal = mode === 'work' ? 25 * 60 : 5 * 60;
  const pomodoroElapsed = pomodoroTotal - timeLeft;

  return (
    <div className="min-h-screen pb-8">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-5">
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Chapter III · Concentration
        </div>
        <h1
          className="text-[32px] font-medium leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          The work<br />
          <em style={{ color: '#c9a84c' }}>before you.</em>
        </h1>
      </div>

      <ChapterRule className="mx-5" />

      {/* ── Pomodoro Timer ──────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <GlassCard>
          <div className="p-4">
            <div className="text-[10px] tracking-[1.8px] uppercase mb-4" style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}>
              Focus Session
            </div>

            {/* Mode toggle */}
            <div
              className="flex gap-1 p-1 rounded-xl mb-6"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {(['work', 'break'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setTimeLeft(m === 'work' ? 25 * 60 : 5 * 60); setIsRunning(false); }}
                  className="flex-1 py-2 rounded-lg text-[11px] tracking-[1px] uppercase transition-all"
                  style={
                    mode === m
                      ? { background: '#c9a84c', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }
                      : { color: '#9aa0a6', fontFamily: 'var(--font-mono, monospace)' }
                  }
                >
                  {m === 'work' ? '25 min Work' : '5 min Break'}
                </button>
              ))}
            </div>

            {/* Orbit timer */}
            <div className="flex justify-center mb-4">
              <TimerOrbit elapsed={pomodoroElapsed} total={pomodoroTotal} isRunning={isRunning} />
            </div>

            {/* Controls */}
            <div className="flex gap-3 justify-center mb-4">
              <button
                onClick={() => setIsRunning(r => !r)}
                className="rounded-2xl px-8 py-3 font-bold text-[15px] transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }}
              >
                {isRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={resetTimer}
                className="rounded-2xl px-6 py-3 text-[13px] transition-all hover:opacity-80"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#9aa0a6',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                Reset
              </button>
            </div>

            <p
              className="text-center text-[11px] tracking-[1px] uppercase"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
            >
              Sessions today:{' '}
              <span style={{ color: '#c9a84c', fontWeight: 700 }}>{sessions}</span>
            </p>
          </div>
        </GlassCard>
      </div>

      <ChapterRule className="mx-5" />

      {/* ── Reading Timer ───────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <GlassCard>
          <div className="p-4">
            <div className="text-[10px] tracking-[1.8px] uppercase mb-3" style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}>
              Reading Session
            </div>

            {/* Timer display */}
            <div className="text-center mb-4">
              <div
                className="text-[48px] font-medium leading-none"
                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e3c77a' }}
              >
                {formatTime(readingSeconds)}
              </div>
              <p
                className="text-[11px] mt-1.5 tracking-[0.5px]"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
              >
                {selectedBook
                  ? `${selectedBook.title}${selectedBook.currentPage ? ` · p.${selectedBook.currentPage}` : ''}`
                  : 'Select a book below to start'}
              </p>
            </div>

            {/* Reading controls */}
            {showStartConfig ? (
              <div className="flex flex-col gap-2 mb-4">
                <p
                  className="text-[13px] font-medium"
                  style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                >
                  Starting page — {selectedBook?.title}
                </p>
                <input
                  className="px-4 py-3 rounded-xl text-[14px] outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    color: '#e6eef8',
                    fontFamily: 'var(--font-sans, system-ui)',
                  }}
                  type="number"
                  placeholder={`Current page (${selectedBook?.currentPage || 1})`}
                  value={startPageInput}
                  onChange={e => setStartPageInput(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && confirmReadingStart()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowStartConfig(false)}
                    className="text-[11px] tracking-[1px] uppercase transition-opacity hover:opacity-70"
                    style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmReadingStart}
                    className="rounded-xl px-4 py-1.5 text-[11px] tracking-[1px] uppercase font-bold transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)' }}
                  >
                    Start ▶
                  </button>
                </div>
              </div>
            ) : showEndPageInput ? (
              <div className="flex flex-col gap-2 mb-4">
                <p
                  className="text-[13px] font-medium"
                  style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                >
                  What page did you stop on?
                </p>
                <input
                  className="px-4 py-3 rounded-xl text-[14px] outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    color: '#e6eef8',
                    fontFamily: 'var(--font-sans, system-ui)',
                  }}
                  type="number"
                  placeholder="Ending page"
                  value={endPageInput}
                  onChange={e => setEndPageInput(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && saveReadingSession()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowEndPageInput(false); setEndPageInput(''); }}
                    className="text-[11px] tracking-[1px] uppercase transition-opacity hover:opacity-70"
                    style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveReadingSession}
                    className="rounded-xl px-4 py-1.5 text-[11px] tracking-[1px] uppercase font-bold transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)' }}
                  >
                    Save Session
                  </button>
                </div>
              </div>
            ) : isReadingRunning ? (
              <div className="flex gap-2 justify-center mb-4">
                <button
                  onClick={() => setIsReadingPaused(p => !p)}
                  className="rounded-2xl px-6 py-2.5 font-bold text-[13px] transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }}
                >
                  {isReadingPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={handleReadingStop}
                  className="rounded-2xl px-6 py-2.5 font-bold text-[13px] transition-opacity hover:opacity-90"
                  style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
                >
                  Stop
                </button>
              </div>
            ) : (
              <div className="flex justify-center mb-4">
                <button
                  onClick={handleReadingStart}
                  disabled={!selectedBook}
                  className="rounded-2xl px-8 py-2.5 font-bold text-[13px] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }}
                >
                  {selectedBook ? 'Start Reading' : 'Select a book below'}
                </button>
              </div>
            )}

            {/* Book list */}
            <div className="flex justify-between items-center mb-2">
              <span
                className="text-[10px] tracking-[1.4px] uppercase"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
              >
                Currently Reading
              </span>
              <button
                onClick={() => setShowAddBook(s => !s)}
                className="text-[10px] tracking-[1px] uppercase transition-opacity hover:opacity-70"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
              >
                + Add Book
              </button>
            </div>

            {showAddBook && (
              <div className="flex flex-col gap-2 mb-3">
                <input
                  className="px-4 py-3 rounded-xl text-[14px] outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e6eef8',
                    fontFamily: 'var(--font-sans, system-ui)',
                  }}
                  placeholder="Book title…"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  autoFocus
                />
                <input
                  className="px-4 py-3 rounded-xl text-[14px] outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e6eef8',
                    fontFamily: 'var(--font-sans, system-ui)',
                  }}
                  placeholder="Author…"
                  value={newAuthor}
                  onChange={e => setNewAuthor(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddBook(false)}
                    className="text-[11px] tracking-[1px] uppercase transition-opacity hover:opacity-70"
                    style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addBook}
                    className="rounded-xl px-4 py-1.5 text-[11px] tracking-[1px] uppercase font-bold transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)' }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {currentBooks.length === 0 ? (
              <p
                className="text-[13px] italic"
                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
              >
                No books in progress. Add one to track your reading.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {currentBooks.map(book => (
                  <button
                    key={book.id}
                    onClick={() => !isReadingRunning && setSelectedBook(book)}
                    disabled={isReadingRunning}
                    className="w-full text-left flex items-center gap-2 px-3 py-3 rounded-xl transition-all disabled:opacity-60"
                    style={{
                      background: selectedBook?.id === book.id ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedBook?.id === book.id ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[14px] font-medium truncate"
                        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                      >
                        {book.title}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                      >
                        {book.author} · p.{book.currentPage}
                      </p>
                    </div>
                    {selectedBook?.id === book.id && (
                      <span style={{ color: '#c9a84c', fontSize: 13 }}>✓</span>
                    )}
                    {!isReadingRunning && (
                      <div className="flex gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <span
                          onClick={() => finishBook(book.id)}
                          className="text-[10px] tracking-[1px] uppercase cursor-pointer transition-opacity hover:opacity-70"
                          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                        >
                          Finished
                        </span>
                        <span
                          onClick={() => removeBook(book.id)}
                          className="text-[10px] cursor-pointer transition-colors hover:text-red-400"
                          style={{ color: '#9aa0a6' }}
                        >
                          ✕
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ── Recent Sessions ─────────────────────────────────────── */}
      {readingSessions.length > 0 && (
        <div className="px-4 pb-4">
          <GlassCard>
            <div className="p-4">
              <div className="text-[10px] tracking-[1.8px] uppercase mb-3" style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}>
                Recent Sessions
              </div>
              <div className="flex flex-col gap-3">
                {readingSessions.slice(-5).reverse().map(s => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div>
                      <p
                        className="text-[14px] font-medium"
                        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                      >
                        {s.bookTitle}
                      </p>
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                      >
                        {s.dateFormatted} · pp.{s.startPage}–{s.endPage}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-[14px] font-medium"
                        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#c9a84c' }}
                      >
                        {s.pagesRead} pages
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                      >
                        {Math.floor(s.duration / 60)} min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
