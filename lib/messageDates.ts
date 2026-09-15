// Dates on conversations, so a counselor's reply can be matched to the
// reflection or entry that prompted it when reading back. Messages are
// grouped under a day divider and each bubble carries its clock time.
// The web twin keeps the same helpers in web/src/lib/messageDates.ts.

export function isSameLocalDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

/** "Today", "Yesterday", or e.g. "Mon, Sep 8" (with the year when it differs). */
export function dayLabel(timestamp: number, now = Date.now()): string {
  if (isSameLocalDay(timestamp, now)) return 'Today';
  if (isSameLocalDay(timestamp, now - 24 * 60 * 60 * 1000)) return 'Yesterday';
  const d = new Date(timestamp);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function clockTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** True when a day divider belongs above message `index` in `list`. */
export function startsNewDay(list: { timestamp?: number }[], index: number): boolean {
  const ts = list[index]?.timestamp;
  if (!ts) return false;
  const prev = list[index - 1]?.timestamp;
  return index === 0 || !prev || !isSameLocalDay(prev, ts);
}
