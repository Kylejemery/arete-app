'use client';

import { useState } from 'react';
import { ConfirmDialog, Modal } from '@/components/ui';
import { HeroCard, SectionCard, StatTile } from './primitives';
import type { Book } from '@/lib/types';
import { formatReadingTime, type FinishedBook, type ProgressSession } from './types';

/** A session's day as a `Date.toDateString()` string, or null if unusable. */
function sessionDayStrings(session: ProgressSession): string[] {
  const raw = session.date;
  if (!raw) return [];
  const parsed = new Date(raw);
  // Mobile stores `Date.toDateString()`; the web Focus page stores an ISO
  // timestamp. Accept both so a streak survives a user who uses both apps.
  return Number.isNaN(parsed.getTime()) ? [raw] : [raw, parsed.toDateString()];
}

/**
 * Consecutive days with at least one reading session, walking backwards from
 * today — or from yesterday when today has no session yet, so the streak does
 * not read as broken before the day's session happens. The cursor sits at noon
 * so decrementing a day never lands on a DST boundary.
 */
export function computeReadingStreak(sessions: ProgressSession[]): number {
  const days = new Set<string>();
  for (const s of sessions) for (const d of sessionDayStrings(s)) days.add(d);
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Newest first. Sessions without a parsable date sort last, in stored order. */
function sortedSessions(sessions: ProgressSession[]): ProgressSession[] {
  return [...sessions].sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : NaN;
    const tb = b.date ? new Date(b.date).getTime() : NaN;
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });
}

export default function ReadingTab({
  books,
  currentBooks,
  sessions,
  todayReadingSeconds,
  onSaveBooks,
}: {
  books: FinishedBook[];
  currentBooks: Book[];
  sessions: ProgressSession[];
  todayReadingSeconds: number;
  onSaveBooks: (next: FinishedBook[]) => void | Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const totalPages = sessions.reduce((sum, s) => sum + (s.pagesRead ?? 0), 0);
  const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  const readingStreak = computeReadingStreak(sessions);
  const recent = sortedSessions(sessions).slice(0, 10);

  const closeAdd = () => {
    setShowAdd(false);
    setTitle('');
    setAuthor('');
    setTitleError(false);
  };

  const addBook = async () => {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    const book: FinishedBook = {
      // Mobile omits this, and its delete path filters on `b.id` — which wipes
      // every id-less book at once. Everything written here carries one.
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      author: author.trim(),
      dateFinished: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    };
    await onSaveBooks([book, ...books]);
    closeAdd();
  };

  const confirmDelete = async () => {
    if (pendingDelete === null) return;
    // Index, not id: legacy rows written by mobile have no id at all, and
    // filtering on one would take all of them with it.
    await onSaveBooks(books.filter((_, i) => i !== pendingDelete));
    setPendingDelete(null);
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e6eef8',
  } as const;

  return (
    <div className="space-y-3">
      <HeroCard emoji="📚" value={books.length} label="Books Finished" />
      <HeroCard emoji="📖🔥" value={readingStreak} label="Day Reading Streak" />

      <div className="grid grid-cols-3 gap-2">
        <StatTile value={totalPages} label={'Total\nPages'} />
        <StatTile value={formatReadingTime(totalSeconds)} label={'Total\nTime'} />
        <StatTile value={formatReadingTime(todayReadingSeconds)} label={'Read\nToday'} />
      </div>

      <SectionCard title="📖 Currently Reading">
        {currentBooks.length === 0 ? (
          <p className="text-[13px]" style={{ color: '#9aa0a6' }}>
            No books in progress. Start a session in the Timer!
          </p>
        ) : (
          <div className="space-y-3">
            {currentBooks.map((book, i) => (
              <div key={`${book.title}-${book.author ?? ''}-${i}`} className="flex items-start gap-3">
                <span aria-hidden className="text-[15px] leading-6">
                  📕
                </span>
                <div className="min-w-0">
                  <p className="text-[14px]" style={{ color: '#e6eef8' }}>
                    {book.title}
                  </p>
                  {book.author ? (
                    <p className="text-[12px]" style={{ color: '#9aa0a6' }}>
                      by {book.author}
                    </p>
                  ) : null}
                  <p className="text-[11px] mt-0.5" style={{ color: '#c9a84c' }}>
                    Page {book.currentPage ?? 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {recent.length > 0 && (
        <SectionCard title="📅 Reading History">
          <div className="space-y-3">
            {recent.map((s, i) => (
              <div key={`${s.date ?? ''}-${s.bookTitle}-${i}`} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] truncate" style={{ color: '#e6eef8' }}>
                    {s.bookTitle}
                  </p>
                  <p className="text-[11px]" style={{ color: '#9aa0a6' }}>
                    {s.dateFormatted}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {s.startPage !== undefined && s.endPage !== undefined && (
                    <p className="text-[12px]" style={{ color: '#c9a84c' }}>
                      pp. {s.startPage}&rarr;{s.endPage}
                    </p>
                  )}
                  <p className="text-[11px]" style={{ color: '#9aa0a6' }}>
                    {formatReadingTime(s.duration ?? 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="📚 Books Finished"
        action={
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            aria-label="Add a finished book"
            className="w-7 h-7 rounded-full text-[16px] leading-none hover:opacity-90"
            style={{ background: '#c9a84c', color: '#0f1724' }}
          >
            +
          </button>
        }
      >
        {books.length === 0 ? (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 text-[13px] hover:opacity-80"
            style={{ color: '#c9a84c' }}
          >
            <span aria-hidden>⊕</span> Add your first finished book!
          </button>
        ) : (
          <div className="space-y-2">
            {books.map((book, i) => (
              <div key={book.id ?? `${book.title}-${i}`} className="flex items-center gap-3">
                <span
                  className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[11px]"
                  style={{ background: 'rgba(201,168,76,0.14)', color: '#c9a84c' }}
                >
                  {books.length - i}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] truncate" style={{ color: '#e6eef8' }}>
                    {book.title}
                  </p>
                  {book.author ? (
                    <p className="text-[12px] truncate" style={{ color: '#9aa0a6' }}>
                      by {book.author}
                    </p>
                  ) : null}
                  {book.dateFinished ? (
                    <p className="text-[11px]" style={{ color: '#9aa0a6' }}>
                      Finished {book.dateFinished}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDelete(i)}
                  aria-label={`Delete ${book.title}`}
                  className="shrink-0 text-[14px] hover:opacity-80"
                  style={{ color: '#ff4444' }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Modal open={showAdd} onClose={closeAdd} title="📚 Book Finished!" sheet maxWidth={420}>
        <div className="space-y-3">
          <div>
            <input
              autoFocus
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                if (titleError) setTitleError(false);
              }}
              placeholder="Book title *"
              className="w-full rounded-lg px-3 py-2.5 text-[14px] outline-none"
              style={inputStyle}
            />
            {titleError && (
              <p className="text-[12px] mt-1.5" style={{ color: '#ff4444' }}>
                Please enter a book title.
              </p>
            )}
          </div>
          <input
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="Author (optional)"
            className="w-full rounded-lg px-3 py-2.5 text-[14px] outline-none"
            style={inputStyle}
          />
          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={closeAdd}
              className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80"
              style={{ border: '1px solid rgba(255,255,255,0.14)', color: '#9aa0a6' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addBook}
              className="px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
              style={{ background: '#c9a84c', color: '#0f1724' }}
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete Book"
        message="Remove this book from your list?"
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
