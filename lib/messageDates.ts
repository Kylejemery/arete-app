// Dates on conversations, so a counselor's reply can be matched to the
// reflection or entry that prompted it when reading back. Messages are
// grouped under a day divider and each bubble carries its clock time.
// The web twin keeps the same helpers in web/src/lib/messageDates.ts.

/**
 * Read a message timestamp as milliseconds, whatever unit it arrived in.
 *
 * Two sources hand us seconds, not milliseconds. expo-notifications reports a
 * delivered notification's `date` in seconds on iOS (a bridged Foundation
 * Date, so often fractional: 1788540330.195653), and any value read straight
 * out of the Screen Time extension's UserDefaults is a
 * `timeIntervalSince1970`. Read as milliseconds, those land in January 1970,
 * which put the line under a 1970 day divider and, worse, defeated every
 * same-day dedupe the seeding path relies on: the same nudge was appended
 * twice, once under each unit.
 *
 * Seconds-since-epoch is ~1.8e9 today and milliseconds ~1.8e12, so the two
 * cannot be confused for any date this app will ever show.
 */
export function epochToMillis(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n < 1e11 ? n * 1000 : n);
}

export function isSameLocalDay(a: number, b: number): boolean {
  const da = new Date(epochToMillis(a));
  const db = new Date(epochToMillis(b));
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

/** "Today", "Yesterday", or e.g. "Mon, Sep 8" (with the year when it differs). */
export function dayLabel(timestamp: number, now = Date.now()): string {
  if (isSameLocalDay(timestamp, now)) return 'Today';
  if (isSameLocalDay(timestamp, now - 24 * 60 * 60 * 1000)) return 'Yesterday';
  const d = new Date(epochToMillis(timestamp));
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function clockTime(timestamp: number): string {
  return new Date(epochToMillis(timestamp)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** True when a day divider belongs above message `index` in `list`. */
export function startsNewDay(list: { timestamp?: number }[], index: number): boolean {
  const ts = list[index]?.timestamp;
  if (!ts) return false;
  const prev = list[index - 1]?.timestamp;
  return index === 0 || !prev || !isSameLocalDay(prev, ts);
}
