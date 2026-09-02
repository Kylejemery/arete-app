// Counselor lines that arrive as notifications (reminders scheduled in
// Settings, Attend nudges fired by the Screen Time extension) are messages
// FROM a counselor: each one is seeded into the Cabinet thread so the
// notification becomes the opening of a conversation.
//
// A notification tapped, or delivered while the app is open, seeds itself.
// One that fired while the app was closed and was then opened from the home
// screen never reaches JS at all, so on every foreground we also recover
// what was missed from three places: crossings the extension recorded,
// notifications still in the tray, and scheduled reminders whose time has
// passed since the last check.
//
// Every path dedupes on one id per delivery, and every path must derive the
// SAME id for the same delivery: a weekly reminder is `identifier:day`, where
// the day is the calendar day the reminder fired. Seeding is serialised
// through one queue so the seen-list check and the thread append cannot
// interleave, and the thread itself is checked for the same line before an
// append, as a last guard against ids that drift between app versions.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { DeviceEventEmitter, Platform } from 'react-native';
import { appendMessages, loadThread } from '../services/threadService';
import { getPendingAttendLines } from './attend';
import { getUserCabinet } from './db';

export const CABINET_THREAD_UPDATED = 'cabinet-thread-updated';

const KEY_SEEN = 'cabinet_seeded_notifications';
const KEY_LAST_CHECK = 'cabinet_seed_last_check';

// A weekly reminder fires at most once a day; a line with the same sender and
// text inside this window is the same delivery, whatever id it arrived under.
const SAME_LINE_WINDOW_MS = 20 * 60 * 60 * 1000;

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Unix time in milliseconds. iOS reports a delivered notification's `date`
 * in seconds while Android and Date.now() use milliseconds; anything below
 * 1e12 (before 2001 in ms) is treated as seconds.
 */
export function toMillis(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
}

/** When a delivered notification fired, in ms; now if the platform omits it. */
function deliveredAt(n: Notifications.Notification | null | undefined): number {
  return toMillis((n as any)?.date) ?? Date.now();
}

async function alreadySeeded(id: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY_SEEN);
  const seen: string[] = raw ? JSON.parse(raw) : [];
  if (seen.includes(id)) return true;
  seen.push(id);
  while (seen.length > 120) seen.shift();
  await AsyncStorage.setItem(KEY_SEEN, JSON.stringify(seen));
  return false;
}

// One queue for every seed so check-then-append never interleaves.
let seedQueue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = seedQueue.then(task, task);
  seedQueue = run.catch(() => {});
  return run;
}

/** Append one counselor line to the Cabinet thread, once per delivery id. */
export function seedCounselorLine(id: string, counselorName: string, body: string, timestamp = Date.now()): Promise<boolean> {
  return enqueue(async () => {
    try {
      if (await alreadySeeded(id)) return false;
      const thread = await loadThread('cabinet');
      const duplicate = thread.messages.some(m =>
        m.role === 'assistant' &&
        m.counselorName === counselorName &&
        m.content === body &&
        Math.abs((toMillis(m.timestamp) ?? 0) - timestamp) < SAME_LINE_WINDOW_MS,
      );
      if (duplicate) return false;
      await appendMessages('cabinet', [{ role: 'assistant', content: body, timestamp, counselorName }]);
      DeviceEventEmitter.emit(CABINET_THREAD_UPDATED);
      return true;
    } catch {
      return false; // best effort: never block boot or navigation
    }
  });
}

// A weekly reminder fires at most once a day, so its delivery id is the
// request identifier plus the day it fired. Attend nudges carry their own ids.
function deliveryId(n: Notifications.Notification, firedAt: number): string {
  const data: any = n.request?.content?.data;
  const day = dayKey(new Date(firedAt));
  // Attend nudges: the same id the crossing-based recovery uses.
  if (typeof data?.attendEvent === 'string') return `attend:${data.attendEvent}:${day}`;
  return `${n.request?.identifier || 'n'}:${day}`;
}

/** Seed a delivered notification's line, if it carries one. */
export async function seedFromNotification(n: Notifications.Notification | null | undefined): Promise<boolean> {
  const data: any = n?.request?.content?.data;
  if (!n || !data?.seedMessage || !data?.counselorName) return false;
  const when = deliveredAt(n);
  return seedCounselorLine(deliveryId(n, when), String(data.counselorName), String(data.seedMessage), when);
}

// expo-notifications reports an iOS calendar trigger's components under
// `dateComponents`; older shapes put them at the top level. Read either.
function calendarParts(trigger: any): { weekday?: number; hour?: number; minute?: number } | null {
  if (!trigger) return null;
  const c = trigger.dateComponents ?? trigger.value ?? trigger;
  if (typeof c?.hour !== 'number' && typeof c?.minute !== 'number') return null;
  return { weekday: c.weekday, hour: c.hour, minute: c.minute };
}

let recovering: Promise<number> | null = null;

/**
 * Recover counselor lines that fired while the app was closed. Call on boot
 * and whenever the app returns to the foreground. Returns how many lines
 * were added. Concurrent calls (boot plus the first foreground event) share
 * one run.
 */
export function seedMissedCounselorLines(): Promise<number> {
  if (Platform.OS === 'web') return Promise.resolve(0);
  if (recovering) return recovering;
  recovering = recoverMissedLines().finally(() => { recovering = null; });
  return recovering;
}

async function recoverMissedLines(): Promise<number> {
  let added = 0;
  const now = Date.now();

  // 1. Attend crossings the Screen Time extension recorded today.
  try {
    let names: string[] = [];
    try { names = (await getUserCabinet()).map(c => c.name).filter(Boolean); } catch { /* defaults */ }
    for (const line of await getPendingAttendLines(names)) {
      if (await seedCounselorLine(line.id, line.counselor, line.body, line.at)) added++;
    }
  } catch { /* no extension on this build */ }

  // 2. Delivered notifications still sitting in Notification Center.
  try {
    for (const n of await Notifications.getPresentedNotificationsAsync()) {
      if (await seedFromNotification(n)) added++;
    }
  } catch { /* permissions or platform */ }

  // 3. Repeating reminders whose time today has passed since the last check
  //    (covers a tray the user cleared). The first run only records the
  //    clock, so a reminder scheduled after its slot is not seeded as missed.
  try {
    const rawLast = await AsyncStorage.getItem(KEY_LAST_CHECK);
    await AsyncStorage.setItem(KEY_LAST_CHECK, String(now));
    const last = rawLast ? Number(rawLast) : NaN;
    if (Number.isFinite(last)) {
      const today = new Date(now);
      for (const r of await Notifications.getAllScheduledNotificationsAsync()) {
        const data: any = r.content?.data;
        if (!data?.seedMessage || !data?.counselorName) continue;
        const parts = calendarParts(r.trigger);
        if (!parts) continue;
        if (typeof parts.weekday === 'number' && parts.weekday !== today.getDay() + 1) continue;
        const fires = new Date(now);
        fires.setHours(parts.hour ?? 0, parts.minute ?? 0, 0, 0);
        const at = fires.getTime();
        if (at > now || at <= last) continue;
        if (await seedCounselorLine(`${r.identifier}:${dayKey(today)}`, String(data.counselorName), String(data.seedMessage), at)) added++;
      }
    }
  } catch { /* scheduling unavailable */ }

  return added;
}
