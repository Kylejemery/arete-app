import AsyncStorage from '@react-native-async-storage/async-storage';

// Calendar awareness — today's events via expo-calendar, read-only, so the
// Cabinet can speak to the shape of the user's day: how packed it is,
// what's next, whether tomorrow starts early. Mirrors lib/health.ts: lazy
// require so builds without the module degrade gracefully. Works on iOS and
// Android (expo-calendar supports both).
//
// Privacy: events are read on-device at prompt-build time and reduced to a
// short agenda for counselor context — nothing stored server-side, and the
// user can hide it from the Cabinet in Settings.

type CalendarModule = typeof import('expo-calendar');

const KEY_CONNECTED = 'calendar_connected';
const KEY_SHARE = 'calendar_share_with_cabinet'; // default on

function nativeModule(): CalendarModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-calendar') as CalendarModule;
  } catch {
    return null; // build without the module
  }
}

export function calendarIsSupported(): boolean {
  return nativeModule() !== null;
}

export async function calendarIsConnected(): Promise<boolean> {
  if (!calendarIsSupported()) return false;
  return (await AsyncStorage.getItem(KEY_CONNECTED)) === 'true';
}

export async function connectCalendar(): Promise<'granted' | 'denied' | 'unsupported'> {
  const mod = nativeModule();
  if (!mod) return 'unsupported';
  try {
    const res = await mod.requestCalendarPermissions();
    if (!res.granted) return 'denied';
    await AsyncStorage.setItem(KEY_CONNECTED, 'true');
    return 'granted';
  } catch (e) {
    console.warn('[calendar] permission request failed:', (e as Error)?.message);
    return 'denied';
  }
}

export async function disconnectCalendar(): Promise<void> {
  await AsyncStorage.removeItem(KEY_CONNECTED);
}

async function boolSetting(key: string, fallback: boolean): Promise<boolean> {
  const raw = await AsyncStorage.getItem(key);
  return raw === null ? fallback : raw === 'true';
}

export const getShareCalendarWithCabinet = () => boolSetting(KEY_SHARE, true);
export const setShareCalendarWithCabinet = (v: boolean) => AsyncStorage.setItem(KEY_SHARE, String(v));

interface AgendaEvent {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
}

export interface TodayAgenda {
  events: AgendaEvent[]; // today's, sorted by start
  scheduledMinutes: number; // timed (non-all-day) events only
  next: AgendaEvent | null; // first timed event still ahead of now
  tomorrowFirst: AgendaEvent | null; // earliest timed event tomorrow
}

const asDate = (d: string | Date) => (d instanceof Date ? d : new Date(d));

export async function getTodayAgenda(): Promise<TodayAgenda | null> {
  const mod = nativeModule();
  if (!mod || !(await calendarIsConnected())) return null;
  try {
    const perm = await mod.getCalendarPermissions();
    if (!perm.granted) return null;
    const calendars = await mod.getCalendars(mod.EntityTypes.EVENT);
    if (calendars.length === 0) return { events: [], scheduledMinutes: 0, next: null, tomorrowFirst: null };

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(startOfDay);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);

    const raw = await mod.listEvents(calendars, startOfDay, endOfTomorrow);
    const all: AgendaEvent[] = raw
      .map((e) => ({
        title: String(e.title ?? '').trim() || '(untitled)',
        start: asDate(e.startDate),
        end: asDate(e.endDate),
        allDay: !!e.allDay,
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const today = all.filter((e) => e.start < endOfDay && e.end > startOfDay);
    const scheduledMinutes = today
      .filter((e) => !e.allDay)
      .reduce((sum, e) => {
        const mins = (e.end.getTime() - e.start.getTime()) / 60000;
        return sum + (mins > 0 && mins < 24 * 60 ? mins : 0);
      }, 0);
    const next = today.find((e) => !e.allDay && e.start > now) ?? null;
    const tomorrowFirst = all.find((e) => !e.allDay && e.start >= endOfDay) ?? null;

    return { events: today, scheduledMinutes: Math.round(scheduledMinutes), next, tomorrowFirst };
  } catch (e) {
    console.warn('[calendar] agenda read failed:', (e as Error)?.message);
    return null;
  }
}

const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}

/**
 * Calendar context block for counselor prompts. Like the Attend and Health
 * blocks, it always returns something: real agenda lines, or an honest
 * "you cannot see it because …" so a direct "what's on today?" never gets
 * an invented answer.
 */
export async function buildCalendarContext(cabinetCanSee: boolean = true): Promise<string> {
  const wrap = (lines: string[]) =>
    ['[CALENDAR CONTEXT — today]', ...lines.filter(Boolean), '[END CALENDAR CONTEXT]'].join('\n');
  const noData = (reason: string) =>
    wrap([
      reason,
      'If the user asks about their schedule or calendar, say honestly that you cannot see it and why. Never invent events or times.',
    ]);
  try {
    if (!calendarIsSupported()) {
      return noData('You cannot see their calendar: it is not available in this build.');
    }
    if (!(await calendarIsConnected())) {
      return noData('You cannot see their calendar: they have not connected it (it can be connected in Settings).');
    }
    if (!(await getShareCalendarWithCabinet())) {
      return noData('You cannot see their calendar: they chose in Settings not to share it with the Cabinet. Respect that choice without comment unless asked.');
    }
    if (!cabinetCanSee) {
      return noData('You cannot see their calendar: Cabinet visibility of it is part of Arete Premium, and they are on the free tier.');
    }
    const agenda = await getTodayAgenda();
    if (!agenda) {
      return noData('You cannot see their calendar right now: it could not be read (access may have been revoked in system settings).');
    }

    const timed = agenda.events.filter((e) => !e.allDay);
    const allDay = agenda.events.filter((e) => e.allDay);
    const eventLines = [
      ...allDay.slice(0, 2).map((e) => `- All day: ${e.title}`),
      ...timed.slice(0, 6).map((e) => `- ${fmtTime(e.start)}–${fmtTime(e.end)}: ${e.title}`),
    ];
    if (timed.length > 6) eventLines.push(`- …and ${timed.length - 6} more.`);

    return wrap([
      "The user shares today's calendar with you (read-only, reduced on their device to the lines below).",
      agenda.events.length === 0
        ? 'Today: nothing on the calendar.'
        : `Today: ${agenda.events.length} event${agenda.events.length === 1 ? '' : 's'}${agenda.scheduledMinutes > 0 ? `, about ${fmtDuration(agenda.scheduledMinutes)} scheduled` : ''}.`,
      ...eventLines,
      agenda.next ? `Next up: "${agenda.next.title}" at ${fmtTime(agenda.next.start)}.` : '',
      agenda.tomorrowFirst
        ? `Tomorrow starts with "${agenda.tomorrowFirst.title}" at ${fmtTime(agenda.tomorrowFirst.start)}.`
        : '',
      "When the user asks what's on today, answer plainly from the lines above. You may hold the calendar beside their stated priorities in your own voice — a packed afternoon before an unfinished routine, an empty morning that could carry the work they say matters, an early start that argues for an early night. Event titles are the user's private business: speak of them to the user freely, but never assume what an event means beyond its name.",
    ]);
  } catch {
    return noData('You cannot see their calendar right now: it could not be read.');
  }
}
