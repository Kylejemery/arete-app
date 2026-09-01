import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Vitals — Apple Health (HealthKit) awareness via
// @kingstinct/react-native-healthkit: last night's sleep, today's steps and
// exercise minutes, read-only. Mirrors lib/attend.ts: the native module only
// exists in builds that include the config plugin, so every entry point
// guards with a lazy require and older builds / Android degrade gracefully.
//
// Privacy: data is read on-device at prompt-build time and reduced to a few
// coarse lines for counselor context. Nothing is stored server-side; the
// user can hide it from the Cabinet in Settings, and iOS never even tells
// the app whether read access was granted — denied reads just come back
// empty, which we treat as "no data recorded".

type HealthkitModule = typeof import('@kingstinct/react-native-healthkit');

const KEY_CONNECTED = 'health_connected';
const KEY_SHARE = 'health_share_with_cabinet'; // default on

const READ_TYPES = [
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierAppleExerciseTime',
] as const;

function nativeModule(): HealthkitModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@kingstinct/react-native-healthkit') as HealthkitModule;
    if (typeof mod.isHealthDataAvailable === 'function' && !mod.isHealthDataAvailable()) return null;
    return mod;
  } catch {
    return null; // build without the native module
  }
}

export function healthIsSupported(): boolean {
  return nativeModule() !== null;
}

export async function healthIsConnected(): Promise<boolean> {
  if (!healthIsSupported()) return false;
  return (await AsyncStorage.getItem(KEY_CONNECTED)) === 'true';
}

/**
 * Show the HealthKit read-permission sheet. Apple deliberately hides whether
 * the user granted read access, so "connected" only means the sheet has been
 * resolved once — from then on we query and let empty results speak.
 */
export async function connectHealth(): Promise<boolean> {
  const mod = nativeModule();
  if (!mod) return false;
  try {
    await mod.requestAuthorization({ toRead: [...READ_TYPES] });
    await AsyncStorage.setItem(KEY_CONNECTED, 'true');
    return true;
  } catch (e) {
    console.warn('[health] authorization failed:', (e as Error)?.message);
    return false;
  }
}

export async function disconnectHealth(): Promise<void> {
  await AsyncStorage.removeItem(KEY_CONNECTED);
}

async function boolSetting(key: string, fallback: boolean): Promise<boolean> {
  const raw = await AsyncStorage.getItem(key);
  return raw === null ? fallback : raw === 'true';
}

export const getShareHealthWithCabinet = () => boolSetting(KEY_SHARE, true);
export const setShareHealthWithCabinet = (v: boolean) => AsyncStorage.setItem(KEY_SHARE, String(v));

export interface HealthTodaySummary {
  /** Minutes actually asleep last night (18:00 yesterday → now); null = no data. */
  sleepMinutes: number | null;
  /** Local "h:mm pm" the first sleep/in-bed sample started; null = unknown. */
  bedtime: string | null;
  /** Steps so far today; null = no data. */
  steps: number | null;
  /** Apple exercise minutes so far today; null = no data. */
  exerciseMinutes: number | null;
}

// CategoryValueSleepAnalysis: 0 inBed, 1 asleep(Unspecified), 2 awake,
// 3 core, 4 deep, 5 REM.
const isAsleepValue = (v: number) => v === 1 || v === 3 || v === 4 || v === 5;

/** Merge overlapping [start, end] ms intervals and return total minutes. */
function mergedMinutes(intervals: { start: number; end: number }[]): number {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  if (sorted.length === 0) return 0;
  let total = 0;
  let { start: curStart, end: curEnd } = sorted[0];
  for (const i of sorted.slice(1)) {
    if (i.start > curEnd) {
      total += curEnd - curStart;
      curStart = i.start;
      curEnd = i.end;
    } else if (i.end > curEnd) {
      curEnd = i.end;
    }
  }
  total += curEnd - curStart;
  return Math.round(total / 60000);
}

export async function getHealthTodaySummary(): Promise<HealthTodaySummary> {
  const summary: HealthTodaySummary = { sleepMinutes: null, bedtime: null, steps: null, exerciseMinutes: null };
  const mod = nativeModule();
  if (!mod || !(await healthIsConnected())) return summary;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  try {
    const stats = await mod.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
      filter: { date: { startDate: startOfDay, endDate: now } },
      unit: 'count',
    });
    if (stats.sumQuantity) summary.steps = Math.round(stats.sumQuantity.quantity);
  } catch { /* leave null */ }

  try {
    const stats = await mod.queryStatisticsForQuantity('HKQuantityTypeIdentifierAppleExerciseTime', ['cumulativeSum'], {
      filter: { date: { startDate: startOfDay, endDate: now } },
      unit: 'min',
    });
    if (stats.sumQuantity) summary.exerciseMinutes = Math.round(stats.sumQuantity.quantity);
  } catch { /* leave null */ }

  try {
    // "Last night" = 18:00 yesterday onward; multiple sources (watch + phone)
    // overlap, so asleep intervals are merged before summing.
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - 1);
    windowStart.setHours(18, 0, 0, 0);
    const samples = await mod.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: -1,
      filter: { date: { startDate: windowStart, endDate: now } },
    });
    const asleep = samples
      .filter((s) => isAsleepValue(s.value as number))
      .map((s) => ({ start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime() }));
    if (asleep.length > 0) {
      summary.sleepMinutes = mergedMinutes(asleep);
      const first = samples
        .map((s) => new Date(s.startDate))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      summary.bedtime = first.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  } catch { /* leave null */ }

  return summary;
}

function fmtSleep(minutes: number): string {
  const rounded = Math.round(minutes / 10) * 10; // keep it coarse
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return h > 0 ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}

/**
 * Health context block for counselor prompts. Like buildAttendContext, it
 * always returns a block so the Cabinet is never silently blind: when data
 * is unavailable it says exactly why, so "how did I sleep?" gets an honest
 * answer instead of an invented one.
 */
export async function buildHealthContext(cabinetCanSee: boolean = true): Promise<string> {
  const wrap = (lines: string[]) =>
    ['[HEALTH CONTEXT — Apple Health]', ...lines.filter(Boolean), '[END HEALTH CONTEXT]'].join('\n');
  const noData = (reason: string) =>
    wrap([
      reason,
      'If the user asks about their sleep, steps, or exercise, say honestly that you cannot see it and why. Never invent or estimate health numbers.',
    ]);
  try {
    if (!healthIsSupported()) {
      return noData('You cannot see their health data: Apple Health is not available on this device or build.');
    }
    if (!(await healthIsConnected())) {
      return noData('You cannot see their health data: they have not connected Apple Health (it can be connected in Settings).');
    }
    if (!(await getShareHealthWithCabinet())) {
      return noData('You cannot see their health data: they chose in Settings not to share it with the Cabinet. Respect that choice without comment unless asked.');
    }
    if (!cabinetCanSee) {
      return noData('You cannot see their health data: Cabinet visibility of Health signals is part of Arete Premium, and they are on the free tier.');
    }
    const s = await getHealthTodaySummary();
    return wrap([
      'The user shares coarse Apple Health signals with you (read-only, reduced on their device to the lines below).',
      s.sleepMinutes !== null
        ? `Last night: about ${fmtSleep(s.sleepMinutes)} asleep${s.bedtime ? `, in bed around ${s.bedtime}` : ''}.`
        : 'Last night: no sleep data recorded (they may not track sleep, or read access was not granted).',
      s.steps !== null ? `Today so far: about ${s.steps.toLocaleString('en-US')} steps.` : 'Today: no step data recorded.',
      s.exerciseMinutes !== null
        ? `Exercise today: about ${s.exerciseMinutes} minute${s.exerciseMinutes === 1 ? '' : 's'}.`
        : '',
      'When the user asks about sleep, movement, or energy, answer plainly from the lines above. You may connect these to their other patterns in your own voice — short sleep beside late-night phone use, a still day beside a heavy mood. Speak as a counselor who has been watching, never as a physician: no diagnoses, no medical advice, and if something looks medically concerning, say a doctor is the one to ask.',
    ]);
  } catch {
    return noData('You cannot see their health data right now: it could not be read.');
  }
}
