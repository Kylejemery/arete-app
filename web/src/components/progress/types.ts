// Local shapes for the Progress surface.
//
// `lib/types.ts` describes the columns as the DB has them; these two aliases
// add the fields the reading pipeline actually writes but the canonical types
// do not declare, so the Progress pages can read them without casting at every
// call site. They stay assignable to the canonical types, so anything typed
// here can still be handed straight to `upsertReadingData()`.

import type { Book, ReadingSession } from '@/lib/types';

/**
 * A finished book. The web assigns an `id` on creation — mobile does not, and
 * its delete path filters on `b.id`, which removes every id-less row at once.
 * Rows written here always carry one; legacy rows are matched by index.
 */
export type FinishedBook = Book & { id?: string };

/** A reading session as the Focus page writes it (page numbers included). */
export type ProgressSession = ReadingSession & {
  id?: string;
  startPage?: number;
  endPage?: number;
};

/** Whether each routine was completed on a given day. */
export interface DayMark {
  morning: boolean;
  evening: boolean;
}

/** Day marks keyed by LOCAL `YYYY-MM-DD` — the same key `check_ins` uses. */
export type DayMarks = Record<string, DayMark>;

export const MORNING_COLOR = '#c9a84c';
export const EVENING_COLOR = '#4a6fa5';

/** Local (not UTC) `YYYY-MM-DD`. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * `calendar_data` has been written with two different key shapes over the
 * app's life — `YYYY-MM-DD` and `Date.toDateString()`. Fold both onto the
 * local `YYYY-MM-DD` form so one lookup serves the week strip, the month grid
 * and the check-in rows. A date-only ISO string is sliced rather than parsed:
 * `new Date('2026-09-02')` is UTC midnight and lands on the previous day west
 * of Greenwich.
 */
export function normalizeDayKey(raw: string): string | null {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  if (iso) return iso[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return dayKey(parsed);
}

/** `0m` under a minute, then `Nm` / `Nh Nm` — mobile's exact formatting. */
export function formatReadingTime(seconds: number): string {
  if (seconds < 60) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
