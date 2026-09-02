'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChapterRule from '@/components/ChapterRule';
import BookList from '@/components/focus/BookList';
import PomodoroCard from '@/components/focus/PomodoroCard';
import ReadingTimerCard from '@/components/focus/ReadingTimerCard';
import SessionHistory from '@/components/focus/SessionHistory';
import TodayReadingCard from '@/components/focus/TodayReadingCard';
import {
  FocusBook,
  FocusSession,
  formatDurationReadable,
  getLocalDateString,
  normalizeBooks,
  normalizeSessions,
  totalPagesOf,
} from '@/components/focus/types';
import { ConfirmDialog, Modal, Spinner, useToast } from '@/components/ui';
import { useRequireUser } from '@/hooks/useRequireUser';
import { getReadingData, upsertReadingData } from '@/lib/db';

type Tab = 'timer' | 'history';

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(201,168,76,0.2)',
  color: '#e6eef8',
  fontFamily: 'var(--font-sans, system-ui)',
} as const;

const goldButton = {
  background: 'linear-gradient(135deg, #e3c77a, #8a6f27)',
  color: '#0f1724',
  fontFamily: 'var(--font-mono, monospace)',
} as const;

export default function FocusPage() {
  const { loading: authLoading, user } = useRequireUser();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('timer');
  const [loading, setLoading] = useState(true);

  // Reading data
  const [books, setBooks] = useState<FocusBook[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [todayDate, setTodayDate] = useState<string | null>(null);

  // Reading timer
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionStartPage, setSessionStartPage] = useState(0);
  const startedAtRef = useRef(0);
  const pausedDurationRef = useRef(0);
  const pauseStartedAtRef = useRef(0);

  // Modals
  const [showStartPage, setShowStartPage] = useState(false);
  const [showEndPage, setShowEndPage] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [startPageInput, setStartPageInput] = useState('');
  const [endPageInput, setEndPageInput] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newStartPage, setNewStartPage] = useState('');
  const [bookPendingDelete, setBookPendingDelete] = useState<FocusBook | null>(null);
  const [finishedBook, setFinishedBook] = useState<FocusBook | null>(null);

  const selectedBook = useMemo(
    () => books.find((b) => b.id === selectedId) ?? null,
    [books, selectedId],
  );

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    void (async () => {
      const data = await getReadingData();
      if (cancelled) return;
      setBooks(normalizeBooks(data?.current_books));
      setSessions(normalizeSessions(data?.reading_sessions));
      const storedDate = data?.today_reading_date ?? null;
      setTodayDate(storedDate);
      setTodaySeconds(storedDate === getLocalDateString() ? data?.today_reading_seconds ?? 0 : 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  // The elapsed time is always derived from wall-clock stamps, so a throttled
  // or backgrounded tab never drifts.
  const syncSessionSeconds = useCallback(() => {
    setSessionSeconds(
      Math.max(0, Math.floor((Date.now() - startedAtRef.current - pausedDurationRef.current) / 1000)),
    );
  }, []);

  useEffect(() => {
    if (!isRunning || isPaused) return;
    const id = window.setInterval(syncSessionSeconds, 500);
    return () => window.clearInterval(id);
  }, [isRunning, isPaused, syncSessionSeconds]);

  useEffect(() => {
    if (!isRunning || isPaused) return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncSessionSeconds();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [isRunning, isPaused, syncSessionSeconds]);

  const todayPages = useMemo(() => {
    const todayStr = new Date().toDateString();
    return sessions
      .filter((s) => s.date === todayStr)
      .reduce((sum, s) => sum + (s.pagesRead || 0), 0);
  }, [sessions]);

  // ── Reading timer ────────────────────────────────────────────

  const handleStartPress = () => {
    if (!selectedBook) {
      toast.show('Select a Book — please select a book you are reading first.');
      return;
    }
    setStartPageInput('');
    setShowStartPage(true);
  };

  const startTimer = () => {
    const page = parseInt(startPageInput, 10);
    if (!page || page <= 0) {
      toast.show('Please enter a valid starting page.');
      return;
    }
    setSessionStartPage(page);
    setShowStartPage(false);
    setSessionSeconds(0);
    startedAtRef.current = Date.now();
    pausedDurationRef.current = 0;
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      pausedDurationRef.current += Date.now() - pauseStartedAtRef.current;
      setIsPaused(false);
      syncSessionSeconds();
    } else {
      pauseStartedAtRef.current = Date.now();
      setIsPaused(true);
    }
  };

  const handleStopPress = () => {
    if (!isPaused) syncSessionSeconds();
    setIsRunning(false);
    setIsPaused(false);
    setEndPageInput('');
    setShowEndPage(true);
  };

  const saveSession = async () => {
    const endPage = parseInt(endPageInput, 10);
    if (!endPage || endPage <= 0) {
      toast.show('Please enter a valid ending page.');
      return;
    }
    if (!selectedBook) {
      setShowEndPage(false);
      return;
    }

    const pagesRead = Math.max(0, endPage - sessionStartPage);
    const duration = sessionSeconds;
    setShowEndPage(false);

    const now = new Date();
    const session: FocusSession = {
      id: Date.now().toString(),
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      bookAuthor: selectedBook.author,
      startPage: sessionStartPage,
      endPage,
      pagesRead,
      duration,
      date: now.toDateString(),
      dateFormatted: now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };

    const updatedSessions = [session, ...sessions];
    const todayKey = getLocalDateString();
    // A stale `today_reading_date` means the counter belongs to a past day.
    const newTodaySeconds = (todayDate === todayKey ? todaySeconds : 0) + duration;
    const updatedBooks = books.map((b) =>
      b.id === selectedBook.id ? { ...b, currentPage: endPage } : b,
    );

    setSessions(updatedSessions);
    setTodaySeconds(newTodaySeconds);
    setTodayDate(todayKey);
    setBooks(updatedBooks);
    setSessionSeconds(0);
    setEndPageInput('');
    setStartPageInput('');

    await upsertReadingData({
      current_books: updatedBooks,
      reading_sessions: updatedSessions,
      today_reading_seconds: newTodaySeconds,
      today_reading_date: todayKey,
    });

    const total = totalPagesOf(selectedBook);
    if (total > 0 && endPage >= total) {
      setFinishedBook({ ...selectedBook, currentPage: endPage });
    } else {
      toast.show(`Session Saved! 📖 — ${pagesRead} pages • ${formatDurationReadable(duration)}`);
    }
  };

  // ── Books ────────────────────────────────────────────────────

  const addBook = async () => {
    if (!newTitle.trim()) {
      toast.show('Please enter a book title.');
      return;
    }
    const startPage = parseInt(newStartPage, 10) || 1;
    const book: FocusBook = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      author: newAuthor.trim(),
      startPage,
      currentPage: startPage,
      totalPages: '',
    };
    const updated = [...books, book];
    setBooks(updated);
    setNewTitle('');
    setNewAuthor('');
    setNewStartPage('');
    setShowAddBook(false);
    await upsertReadingData({ current_books: updated });
  };

  const deleteBook = async (book: FocusBook) => {
    const updated = books.filter((b) => b.id !== book.id);
    setBooks(updated);
    if (selectedId === book.id) setSelectedId(null);
    setBookPendingDelete(null);
    await upsertReadingData({ current_books: updated });
  };

  const markBookFinished = async () => {
    if (!finishedBook) return;
    const book = finishedBook;
    setFinishedBook(null);

    const data = await getReadingData();
    const booksRead = Array.isArray(data?.books_read) ? data.books_read : [];
    const updatedRead = [
      {
        title: book.title,
        author: book.author,
        dateFinished: new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      },
      ...booksRead,
    ];
    const updatedCurrent = books.filter((b) => b.id !== book.id);
    setBooks(updatedCurrent);
    if (selectedId === book.id) setSelectedId(null);
    await upsertReadingData({ books_read: updatedRead, current_books: updatedCurrent });
    toast.show(`🎉 "${book.title}" has been moved to your finished books!`);
  };

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={24} label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* ── Header ────────────────────────────────────────────── */}
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
          The work
          <br />
          <em style={{ color: '#c9a84c' }}>before you.</em>
        </h1>

        <div
          className="flex gap-1 p-1 rounded-xl mt-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {(['timer', 'history'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-[11px] tracking-[1px] uppercase transition-all"
              style={
                tab === t
                  ? {
                      background: '#c9a84c',
                      color: '#0f1724',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 700,
                    }
                  : { color: '#9aa0a6', fontFamily: 'var(--font-mono, monospace)' }
              }
            >
              {t === 'timer' ? 'Timer' : 'History'}
            </button>
          ))}
        </div>
      </div>

      <ChapterRule className="mx-5" />

      {tab === 'timer' ? (
        <>
          <div className="px-4 pb-4">
            <PomodoroCard />
          </div>

          <div className="px-4 pb-4">
            <TodayReadingCard todaySeconds={todaySeconds} todayPages={todayPages} />
          </div>

          <div className="px-4 pb-4">
            <ReadingTimerCard
              seconds={sessionSeconds}
              book={selectedBook}
              isRunning={isRunning}
              isPaused={isPaused}
              onStart={handleStartPress}
              onPauseToggle={handlePauseToggle}
              onStop={handleStopPress}
            />
          </div>

          <div className="px-4 pb-4">
            <BookList
              books={books}
              selectedId={selectedId}
              isRunning={isRunning}
              onSelect={(book) => setSelectedId(book.id)}
              onAdd={() => setShowAddBook(true)}
              onDelete={(book) => setBookPendingDelete(book)}
              onFinish={(book) => setFinishedBook(book)}
            />
          </div>
        </>
      ) : (
        <div className="px-4 pb-4">
          <SessionHistory sessions={sessions} />
        </div>
      )}

      {/* ── Starting page ─────────────────────────────────────── */}
      <Modal
        open={showStartPage}
        onClose={() => {
          setShowStartPage(false);
          setStartPageInput('');
        }}
        title="📖 Starting Page"
        sheet
        maxWidth={420}
      >
        <p className="text-[13px] mb-3" style={{ color: '#9aa0a6' }}>
          {selectedBook?.title}
        </p>
        <input
          className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
          style={inputStyle}
          type="number"
          inputMode="numeric"
          placeholder={`Current page (${selectedBook?.currentPage || 1})`}
          value={startPageInput}
          onChange={(e) => setStartPageInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && startTimer()}
          autoFocus
        />
        <div className="mt-5 flex gap-3 justify-end items-center">
          <button
            type="button"
            onClick={() => {
              setShowStartPage(false);
              setStartPageInput('');
            }}
            className="px-3 py-2 text-[13px] transition-opacity hover:opacity-70"
            style={{ color: '#9aa0a6' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={startTimer}
            className="rounded-xl px-6 py-2.5 text-[13px] font-bold transition-opacity hover:opacity-90"
            style={goldButton}
          >
            Start ▶
          </button>
        </div>
      </Modal>

      {/* ── Session complete ──────────────────────────────────── */}
      <Modal
        open={showEndPage}
        onClose={() => {
          setShowEndPage(false);
          setEndPageInput('');
        }}
        title="✅ Session Complete!"
        sheet
        maxWidth={420}
      >
        <p className="text-[13px] mb-3" style={{ color: '#9aa0a6' }}>
          {selectedBook?.title} • {formatDurationReadable(sessionSeconds)}
        </p>
        <input
          className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
          style={inputStyle}
          type="number"
          inputMode="numeric"
          placeholder="What page did you stop on?"
          value={endPageInput}
          onChange={(e) => setEndPageInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void saveSession()}
          autoFocus
        />
        <div className="mt-5 flex gap-3 justify-end items-center">
          <button
            type="button"
            onClick={() => {
              setShowEndPage(false);
              setEndPageInput('');
            }}
            className="px-3 py-2 text-[13px] transition-opacity hover:opacity-70"
            style={{ color: '#9aa0a6' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveSession()}
            className="rounded-xl px-6 py-2.5 text-[13px] font-bold transition-opacity hover:opacity-90"
            style={goldButton}
          >
            Save
          </button>
        </div>
      </Modal>

      {/* ── Add book ──────────────────────────────────────────── */}
      <Modal
        open={showAddBook}
        onClose={() => {
          setShowAddBook(false);
          setNewTitle('');
          setNewAuthor('');
          setNewStartPage('');
        }}
        title="📚 Add Book"
        sheet
        maxWidth={420}
      >
        <div className="flex flex-col gap-3">
          <input
            className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
            style={inputStyle}
            placeholder="Book title *"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
          <input
            className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
            style={inputStyle}
            placeholder="Author (optional)"
            value={newAuthor}
            onChange={(e) => setNewAuthor(e.target.value)}
          />
          <input
            className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
            style={inputStyle}
            type="number"
            inputMode="numeric"
            placeholder="Starting page (default: 1)"
            value={newStartPage}
            onChange={(e) => setNewStartPage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addBook()}
          />
        </div>
        <div className="mt-5 flex gap-3 justify-end items-center">
          <button
            type="button"
            onClick={() => {
              setShowAddBook(false);
              setNewTitle('');
              setNewAuthor('');
              setNewStartPage('');
            }}
            className="px-3 py-2 text-[13px] transition-opacity hover:opacity-70"
            style={{ color: '#9aa0a6' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void addBook()}
            className="rounded-xl px-6 py-2.5 text-[13px] font-bold transition-opacity hover:opacity-90"
            style={goldButton}
          >
            Add
          </button>
        </div>
      </Modal>

      {/* ── Book finished ─────────────────────────────────────── */}
      <Modal open={!!finishedBook} onClose={() => setFinishedBook(null)} sheet maxWidth={420}>
        <p className="text-[40px] text-center leading-none" aria-hidden="true">
          🎉
        </p>
        <h2
          className="text-[20px] mt-3"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          Book Finished!
        </h2>
        <p className="text-[13px] mt-2" style={{ color: '#9aa0a6' }}>
          Did you finish &ldquo;{finishedBook?.title}&rdquo;?
        </p>
        <div className="mt-5 flex gap-3 justify-end items-center">
          <button
            type="button"
            onClick={() => setFinishedBook(null)}
            className="px-3 py-2 text-[13px] transition-opacity hover:opacity-70"
            style={{ color: '#9aa0a6' }}
          >
            Not Yet
          </button>
          <button
            type="button"
            onClick={() => void markBookFinished()}
            className="rounded-xl px-6 py-2.5 text-[13px] font-bold transition-opacity hover:opacity-90"
            style={goldButton}
          >
            Yes! 🎉
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!bookPendingDelete}
        title="Remove Book"
        message="Remove this book from currently reading?"
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (bookPendingDelete) void deleteBook(bookPendingDelete);
        }}
        onCancel={() => setBookPendingDelete(null)}
      />
    </div>
  );
}
