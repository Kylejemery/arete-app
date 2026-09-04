// Counselor lines that arrive as notifications (reminders scheduled in
// Settings, Attend nudges fired by the Screen Time extension, broadcasts sent
// from the admin console) are messages FROM a counselor: each one is seeded
// into the Cabinet thread so the notification becomes the opening of a
// conversation.
//
// A notification tapped, or delivered while the app is open, seeds itself.
// One that fired while the app was closed and was then opened from the home
// screen never reaches JS at all, so on every foreground we also recover what
// was missed from four places: broadcasts the server says this member is
// still owed, crossings the extension recorded, notifications still in the
// tray, and scheduled reminders whose time has passed since the last check.
// Every path dedupes on one id per delivery, and every seed runs through one
// in-process queue: the cold-start tap, the boot sweep and the foreground
// sweep all start within milliseconds of each other, and a dedupe ledger
// that is read, checked and written back without a lock lets two of them
// pass the same id. The thread itself is the last line of defence: the same
// words from the same day are never appended twice, whichever counselor
// signed them.
//
// Broadcasts are the one source that does not depend on a notification at
// all — the server owes each one until the app acknowledges it — because most
// members never grant notification permission.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { DeviceEventEmitter, Platform } from 'react-native';
import { loadThread, sameCounselorLine, saveThread } from '../services/threadService';
import { getPendingAttendLines } from './attend';
import { acknowledgeBroadcasts, fetchPendingBroadcasts } from './broadcasts';
import { getUserCabinet } from './db';

export const CABINET_THREAD_UPDATED = 'cabinet-thread-updated';

const KEY_SEEN = 'cabinet_seeded_notifications';
const KEY_LAST_CHECK = 'cabinet_seed_last_check';

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// One seed at a time, in arrival order. A rejected seed never poisons the
// queue for the next one.
let seedQueue: Promise<unknown> = Promise.resolve();
function serialized<T>(work: () => Promise<T>): Promise<T> {
  const run = seedQueue.then(work, work);
  seedQueue = run.catch(() => undefined);
  return run;
}

// Ids seeded this process, checked before the stored ledger so a repeat
// within one session never touches storage at all.
const seenThisSession = new Set<string>();

async function alreadySeeded(id: string): Promise<boolean> {
  if (seenThisSession.has(id)) return true;
  seenThisSession.add(id);
  const raw = await AsyncStorage.getItem(KEY_SEEN);
  const seen: string[] = raw ? JSON.parse(raw) : [];
  if (seen.includes(id)) return true;
  seen.push(id);
  while (seen.length > 120) seen.shift();
  await AsyncStorage.setItem(KEY_SEEN, JSON.stringify(seen));
  return false;
}

/** Append one counselor line to the Cabinet thread, once per delivery id. */
export function seedCounselorLine(id: string, counselorName: string, body: string, timestamp = Date.now()): Promise<boolean> {
  return serialized(async () => {
    try {
      if (await alreadySeeded(id)) return false;
      const line = { role: 'assistant' as const, content: body, timestamp, counselorName };
      const thread = await loadThread('cabinet');
      // Same words, same day, already there: the delivery reached the thread
      // under another id (a tray notification and the crossing it came from,
      // a reminder rescheduled under a fresh identifier).
      if (thread.messages.some(m => sameCounselorLine(m, line))) return false;
      await saveThread({ ...thread, messages: [...thread.messages, line] });
      DeviceEventEmitter.emit(CABINET_THREAD_UPDATED);
      return true;
    } catch {
      return false; // best effort: never block boot or navigation
    }
  });
}

// A weekly reminder fires at most once a day, so its delivery id is the
// request identifier plus the day. Attend nudges carry their own ids.
function deliveryId(n: Notifications.Notification): string {
  const data: any = n.request?.content?.data;
  const when = Number((n as any)?.date) || Date.now();
  const day = dayKey(new Date(when));
  // Broadcasts: one message to the whole membership, so dedupe on its id —
  // the same key the server-owed sweep uses. A member who taps the push and a
  // member who only ever sees the Cabinet post both end up with one line.
  if (typeof data?.broadcastId === 'string') return `broadcast:${data.broadcastId}`;
  // Attend nudges: the same id the crossing-based recovery uses.
  if (typeof data?.attendEvent === 'string') return `attend:${data.attendEvent}:${day}`;
  return `${n.request?.identifier || 'n'}:${day}`;
}

/** Seed a delivered notification's line, if it carries one. */
export async function seedFromNotification(n: Notifications.Notification | null | undefined): Promise<boolean> {
  const data: any = n?.request?.content?.data;
  if (!n || !data?.seedMessage || !data?.counselorName) return false;
  const when = Number((n as any)?.date) || Date.now();
  const seeded = await seedCounselorLine(deliveryId(n), String(data.counselorName), String(data.seedMessage), when);
  // Acknowledge even when the line was already there: an unacknowledged
  // broadcast is served again by the pending sweep, and this is what ends it.
  if (typeof data.broadcastId === 'string') await acknowledgeBroadcasts([data.broadcastId]);
  return seeded;
}

// expo-notifications reports an iOS calendar trigger's components under
// `dateComponents`; older shapes put them at the top level. Read either.
function calendarParts(trigger: any): { weekday?: number; hour?: number; minute?: number } | null {
  if (!trigger) return null;
  const c = trigger.dateComponents ?? trigger.value ?? trigger;
  if (typeof c?.hour !== 'number' && typeof c?.minute !== 'number') return null;
  return { weekday: c.weekday, hour: c.hour, minute: c.minute };
}

/**
 * Recover counselor lines that fired while the app was closed. Call on boot
 * and whenever the app returns to the foreground. Returns how many lines
 * were added.
 */
let sweepInFlight: Promise<number> | null = null;

export function seedMissedCounselorLines(): Promise<number> {
  // Boot and the first foreground transition both ask for a sweep almost at
  // once; the second joins the first instead of racing it.
  if (!sweepInFlight) {
    sweepInFlight = sweepMissedCounselorLines().finally(() => { sweepInFlight = null; });
  }
  return sweepInFlight;
}

async function sweepMissedCounselorLines(): Promise<number> {
  let added = 0;
  const now = Date.now();

  // 1. Broadcasts the server says this member is still owed. Deliberately
  //    outside the platform guard below and independent of notification
  //    permission: for a broadcast the Cabinet post *is* the delivery.
  try {
    const pending = await fetchPendingBroadcasts();
    const collected: string[] = [];
    for (const b of pending) {
      if (await seedCounselorLine(`broadcast:${b.id}`, b.counselorName, b.message, b.at)) added++;
      collected.push(b.id);
    }
    if (collected.length > 0) await acknowledgeBroadcasts(collected);
  } catch { /* offline — the next foreground sweeps again */ }

  // Everything below recovers notifications, which has no web equivalent.
  if (Platform.OS === 'web') return added;

  // 2. Attend crossings the Screen Time extension recorded today.
  try {
    let names: string[] = [];
    try { names = (await getUserCabinet()).map(c => c.name).filter(Boolean); } catch { /* defaults */ }
    for (const line of await getPendingAttendLines(names)) {
      if (await seedCounselorLine(line.id, line.counselor, line.body, line.at)) added++;
    }
  } catch { /* no extension on this build */ }

  // 3. Delivered notifications still sitting in Notification Center.
  try {
    for (const n of await Notifications.getPresentedNotificationsAsync()) {
      if (await seedFromNotification(n)) added++;
    }
  } catch { /* permissions or platform */ }

  // 4. Repeating reminders whose time today has passed since the last check
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
