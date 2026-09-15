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
  bookId?: string; // set by the mobile app; web sessions match books by title
  bookTitle: string;
  startPage: number;
  endPage: number;
  pagesRead: number;
  duration: number;
  date: string;
  dateFormatted: string;
}

// Focus (pomodoro) lengths in minutes. Same key and shape as the mobile
// app's lib/focusDurations.ts, kept per browser in localStorage.
const FOCUS_DURATIONS_KEY = 'arete:focus_durations';
const MIN_FOCUS_MINUTES = 1;
const MAX_FOCUS_MINUTES = 180;
type FocusMode = 'work' | 'break';
type FocusDurations = Record<FocusMode, number>;
const DEFAULT_FOCUS_DURATIONS: FocusDurations = { work: 25, break: 5 };

function parseFocusMinutes(raw: string | number | undefined): number | null {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? '').trim(), 10);
  if (!Number.isFinite(n)) return null;
  const whole = Math.round(n);
  if (whole < MIN_FOCUS_MINUTES || whole > MAX_FOCUS_MINUTES) return null;
  return whole;
}

function loadFocusDurations(): FocusDurations {
  try {
    const raw = localStorage.getItem(FOCUS_DURATIONS_KEY);
    if (!raw) return DEFAULT_FOCUS_DURATIONS;
    const parsed = JSON.parse(raw);
    return {
      work: parseFocusMinutes(parsed?.work) ?? DEFAULT_FOCUS_DURATIONS.work,
      break: parseFocusMinutes(parsed?.break) ?? DEFAULT_FOCUS_DURATIONS.break,
    };
  } catch {
    return DEFAULT_FOCUS_DURATIONS;
  }
}

function saveFocusDurations(d: FocusDurations) {
  try { localStorage.setItem(FOCUS_DURATIONS_KEY, JSON.stringify(d)); } catch { /* ignore */ }
}

const sessionBelongsTo = (session: ReadingSession, book: Book) =>
  session.bookId ? session.bookId === book.id : session.bookTitle === book.title;

export default function FocusPage() {
  const router = useRouter();

  // Pomodoro timer
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(DEFAULT_FOCUS_DURATIONS.work * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Adjustable work/break lengths (minutes).
  const [durations, setDurations] = useState<FocusDurations>(DEFAULT_FOCUS_DURATIONS);
  const [showDurationEdit, setShowDurationEdit] = useState(false);
  const [workMinutesInput, setWorkMinutesInput] = useState(String(DEFAULT_FOCUS_DURATIONS.work));
  const [breakMinutesInput, setBreakMinutesInput] = useState(String(DEFAULT_FOCUS_DURATIONS.break));
  const [durationError, setDurationError] = useState('');

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
  // The start page is shown again (editable) when the session ends, so a
  // mistyped number can be corrected before it is saved.
  const [endStartPageInput, setEndStartPageInput] = useState('');
  // Editing a saved session in the Recent Sessions list.
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editStartPage, setEditStartPage] = useState('');
  const [editEndPage, setEditEndPage] = useState('');
  const readingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Saved lengths, once on mount (the timer is never running at mount).
  useEffect(() => {
    const d = loadFocusDurations();
    setDurations(d);
    setTimeLeft(d.work * 60);
  }, []);

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
              return durations.break * 60;
            } else {
              setMode('work');
              return durations.work * 60;
            }
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, mode, durations]);

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
    setTimeLeft(durations[mode] * 60);
  };

  const openDurationEdit = () => {
    setWorkMinutesInput(String(durations.work));
    setBreakMinutesInput(String(durations.break));
    setDurationError('');
    setShowDurationEdit(true);
  };

  const saveDurations = () => {
    const work = parseFocusMinutes(workMinutesInput);
    const brk = parseFocusMinutes(breakMinutesInput);
    if (work == null || brk == null) {
      setDurationError(`Enter whole minutes between ${MIN_FOCUS_MINUTES} and ${MAX_FOCUS_MINUTES}.`);
      return;
    }
    const next: FocusDurations = { work, break: brk };
    setDurations(next);
    saveFocusDurations(next);
    setShowDurationEdit(false);
    // An idle timer shows the new length right away; a running one finishes
    // its current block and uses the new length from the next one.
    if (!isRunning) setTimeLeft(next[mode] * 60);
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
    setEndStartPageInput(String(sessionStartPage));
    setShowEndPageInput(true);
  };

  const saveReadingSession = async () => {
    const endPage = parseInt(endPageInput);
    const startPage = parseInt(endStartPageInput);
    if (!endPage || endPage <= 0 || !startPage || startPage <= 0 || !selectedBook) return;
    setSessionStartPage(startPage);
    const pagesRead = Math.max(0, endPage - startPage);
    const session: ReadingSession = {
      id: Date.now().toString(),
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      startPage,
      endPage,
      pagesRead,
      duration: readingSeconds,
      // Same local-day form the mobile timer writes; the reading streak on
      // both platforms keys on it.
      date: new Date().toDateString(),
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
    setEndStartPageInput('');
    setShowEndPageInput(false);
  };

  const openSessionEdit = (s: ReadingSession) => {
    setEditingSessionId(s.id);
    setEditStartPage(String(s.startPage ?? ''));
    setEditEndPage(String(s.endPage ?? ''));
  };

  const saveSessionEdit = async () => {
    const target = readingSessions.find(s => s.id === editingSessionId);
    if (!target) return;
    const start = parseInt(editStartPage);
    const end = parseInt(editEndPage);
    if (!start || start <= 0 || !end || end <= 0) return;
    const updatedSessions = readingSessions.map(s =>
      s.id === target.id ? { ...s, startPage: start, endPage: end, pagesRead: Math.max(0, end - start) } : s
    );
    setReadingSessions(updatedSessions);

    // If this is the book's latest session, its end page is the book's
    // current page. Ids are Date.now() strings on both platforms, so the
    // largest id is the most recent regardless of list order.
    let updatedBooks = currentBooks;
    const book = currentBooks.find(b => sessionBelongsTo(target, b));
    if (book) {
      const latestId = Math.max(...updatedSessions.filter(s => sessionBelongsTo(s, book)).map(s => Number(s.id) || 0));
      if (String(latestId) === String(target.id)) {
        updatedBooks = currentBooks.map(b => (b.id === book.id ? { ...b, currentPage: end } : b));
        setCurrentBooks(updatedBooks);
        if (selectedBook?.id === book.id) setSelectedBook({ ...selectedBook, currentPage: end });
      }
    }
    setEditingSessionId(null);
    await upsertReadingData({ reading_sessions: updatedSessions, current_books: updatedBooks });
  };

  const pomodoroTotal = durations[mode] * 60;
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
              className="flex gap-1 p-1 rounded-xl mb-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {(['work', 'break'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setTimeLeft(durations[m] * 60); setIsRunning(false); }}
                  className="flex-1 py-2 rounded-lg text-[11px] tracking-[1px] uppercase transition-all"
                  style={
                    mode === m
                      ? { background: '#c9a84c', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }
                      : { color: '#9aa0a6', fontFamily: 'var(--font-mono, monospace)' }
                  }
                >
                  {m === 'work' ? `${durations.work} min Work` : `${durations.break} min Break`}
                </button>
              ))}
            </div>

            {/* Adjustable lengths */}
            {showDurationEdit ? (
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex gap-2">
                  {([['work', workMinutesInput, setWorkMinutesInput], ['break', breakMinutesInput, setBreakMinutesInput]] as const).map(([key, value, set]) => (
                    <label key={key} className="flex-1 flex flex-col gap-1">
                      <span
                        className="text-[10px] tracking-[1.4px] uppercase"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                      >
                        {key === 'work' ? 'Work (min)' : 'Break (min)'}
                      </span>
                      <input
                        className="px-3 py-2 rounded-xl text-[14px] outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(201,168,76,0.2)',
                          color: '#e6eef8',
                          fontFamily: 'var(--font-sans, system-ui)',
                        }}
                        type="number"
                        min={MIN_FOCUS_MINUTES}
                        max={MAX_FOCUS_MINUTES}
                        value={value}
                        onChange={e => set(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveDurations()}
                      />
                    </label>
                  ))}
                </div>
                {durationError && (
                  <p className="text-[11px]" style={{ color: '#f87171', fontFamily: 'var(--font-mono, monospace)' }}>{durationError}</p>
                )}
                {isRunning && (
                  <p className="text-[11px] italic" style={{ color: '#9aa0a6', fontFamily: 'var(--font-serif, Georgia, serif)' }}>
                    The running block finishes at its current length; the new one applies from the next start.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDurationEdit(false)}
                    className="text-[11px] tracking-[1px] uppercase transition-opacity hover:opacity-70"
                    style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveDurations}
                    className="rounded-xl px-4 py-1.5 text-[11px] tracking-[1px] uppercase font-bold transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)' }}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end mb-3 -mt-2">
                <button
                  onClick={openDurationEdit}
                  className="text-[10px] tracking-[1px] uppercase transition-opacity hover:opacity-70"
                  style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                >
                  Adjust length
                </button>
              </div>
            )}

            {/* Orbit timer */}
            <div className="flex justify-center mb-3">
              <TimerOrbit elapsed={pomodoroElapsed} total={pomodoroTotal} isRunning={isRunning} size={200} />
            </div>

            {/* Controls */}
            <div className="flex gap-3 justify-center mb-3">
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
                className="text-[40px] font-medium leading-none"
                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e3c77a' }}
              >
                {formatTime(readingSeconds)}
              </div>
              <p
                className="text-[11px] mt-1.5 tracking-[0.5px]"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
              >
                {selectedBook
                  ? `${selectedBook.title}${isReadingRunning
                      ? ` · from p.${sessionStartPage}`
                      : selectedBook.currentPage ? ` · p.${selectedBook.currentPage}` : ''}`
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
                  Started on page
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
                  placeholder="Starting page"
                  value={endStartPageInput}
                  onChange={e => setEndStartPageInput(e.target.value)}
                />
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
                    onClick={() => { setShowEndPageInput(false); setEndPageInput(''); setEndStartPageInput(''); }}
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
                  editingSessionId === s.id ? (
                    <div key={s.id} className="flex flex-col gap-2">
                      <p
                        className="text-[14px] font-medium"
                        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                      >
                        {s.bookTitle} <span className="text-[10px]" style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}>· {s.dateFormatted}</span>
                      </p>
                      <div className="flex gap-2">
                        {([['Started on page', editStartPage, setEditStartPage], ['Stopped on page', editEndPage, setEditEndPage]] as const).map(([label, value, set]) => (
                          <label key={label} className="flex-1 flex flex-col gap-1">
                            <span
                              className="text-[10px] tracking-[1.4px] uppercase"
                              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                            >
                              {label}
                            </span>
                            <input
                              className="px-3 py-2 rounded-xl text-[14px] outline-none"
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(201,168,76,0.2)',
                                color: '#e6eef8',
                                fontFamily: 'var(--font-sans, system-ui)',
                              }}
                              type="number"
                              value={value}
                              onChange={e => set(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveSessionEdit()}
                            />
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingSessionId(null)}
                          className="text-[11px] tracking-[1px] uppercase transition-opacity hover:opacity-70"
                          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveSessionEdit}
                          className="rounded-xl px-4 py-1.5 text-[11px] tracking-[1px] uppercase font-bold transition-opacity hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)' }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
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
                        {' '}
                        <button
                          onClick={() => openSessionEdit(s)}
                          className="underline underline-offset-2 transition-opacity hover:opacity-70"
                          style={{ color: '#c9a84c' }}
                          aria-label="Edit this session's page numbers"
                        >
                          edit
                        </button>
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
                  )
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
