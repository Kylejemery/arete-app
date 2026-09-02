// localStorage wrapper mirroring the mobile AsyncStorage helpers, plus the
// typed accessors the Cabinet and the routines depend on. Every read and
// write is SSR-guarded and try/catch-swallowed: a page rendered on the server
// or in a browser with site data blocked must still render.

export function getItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore storage errors silently */
  }
}

export function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function getAllKeys(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return Object.keys(window.localStorage);
  } catch {
    return [];
  }
}

/** Local (not UTC) YYYY-MM-DD — the same date key db.ts writes to check_ins. */
export function getTodayDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ----------------------------------------------------------------
// Daily message counter (per-device mirror of profiles.daily_message_count,
// used only for optimistic UI; the authoritative counts are the Supabase
// column checkAndIncrementMessageCount() writes and the server's own RPC).
// ----------------------------------------------------------------

const DAILY_MESSAGES_PREFIX = 'daily_messages_';

export function getDailyMessageCount(dateKey: string = getTodayDateKey()): number {
  const raw = getItem(`${DAILY_MESSAGES_PREFIX}${dateKey}`);
  const n = raw === null ? 0 : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function incrementDailyMessageCount(dateKey: string = getTodayDateKey()): number {
  const next = getDailyMessageCount(dateKey) + 1;
  setItem(`${DAILY_MESSAGES_PREFIX}${dateKey}`, String(next));
  return next;
}

// ----------------------------------------------------------------
// Cabinet privacy: whether the morning/evening routines are shared with the
// counselors. Mirrors mobile's attend_share_routines_with_cabinet setting;
// defaults to on.
// ----------------------------------------------------------------

const KEY_SHARE_ROUTINES = 'attend_share_routines_with_cabinet';

export function getShareRoutinesWithCabinet(): boolean {
  const raw = getItem(KEY_SHARE_ROUTINES);
  return raw === null ? true : raw === 'true';
}

export function setShareRoutinesWithCabinet(value: boolean): void {
  setItem(KEY_SHARE_ROUTINES, String(value));
}
