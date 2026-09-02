/**
 * Shapes and helpers shared by the Focus page and its cards.
 *
 * `reading_data.current_books` / `reading_sessions` are JSON columns, so the
 * rows in the wild are a mix of what the mobile app writes and what earlier
 * versions of the web app wrote. Everything is normalised on read.
 */

export interface FocusBook {
  id: string;
  title: string;
  author: string;
  startPage: number;
  currentPage: number;
  /** Mobile stores this as a string (usually empty). Kept loose on purpose. */
  totalPages: string | number;
}

export interface FocusSession {
  id: string;
  bookId?: string;
  bookTitle: string;
  bookAuthor?: string;
  startPage: number;
  endPage: number;
  pagesRead: number;
  /** Seconds. */
  duration: number;
  /** `Date.toDateString()` — the key the "today" stats match on. */
  date: string;
  dateFormatted: string;
}

/** Today as a local `YYYY-MM-DD` string (never UTC). */
export function getLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** `MM:SS`, minutes uncapped. */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60).toString().padStart(2, '0');
  const s = (safe % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** `1h 5m` / `5m`, matching the mobile app's `formatTimeReadable`. */
export function formatDurationReadable(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** `totalPages` as a number, or 0 when it is absent/blank/unparsable. */
export function totalPagesOf(book: FocusBook | null | undefined): number {
  if (!book) return 0;
  const total = toNumber(book.totalPages, 0);
  return Number.isFinite(total) && total > 0 ? total : 0;
}

export function normalizeBooks(input: unknown): FocusBook[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw, index) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const startPage = toNumber(row.startPage, 1);
    return {
      id: toText(row.id) || `${index}-${toText(row.title) || 'book'}`,
      title: toText(row.title),
      author: toText(row.author),
      startPage,
      currentPage: toNumber(row.currentPage, startPage),
      totalPages:
        typeof row.totalPages === 'number' || typeof row.totalPages === 'string'
          ? row.totalPages
          : '',
    };
  });
}

export function normalizeSessions(input: unknown): FocusSession[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw, index) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const startPage = toNumber(row.startPage, 0);
    const endPage = toNumber(row.endPage, 0);
    return {
      id: toText(row.id) || `session-${index}`,
      bookId: toText(row.bookId) || undefined,
      bookTitle: toText(row.bookTitle),
      bookAuthor: toText(row.bookAuthor) || undefined,
      startPage,
      endPage,
      pagesRead: toNumber(row.pagesRead, Math.max(0, endPage - startPage)),
      duration: toNumber(row.duration, 0),
      date: toText(row.date),
      dateFormatted: toText(row.dateFormatted),
    };
  });
}
