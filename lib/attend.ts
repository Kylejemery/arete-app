import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Attend (Phase 1) — Screen Time awareness via the iOS Family Controls /
// DeviceActivity frameworks (react-native-device-activity).
//
// What iOS allows: the monitor extension learns WHEN self-set thresholds are
// crossed (and can post notifications even with the app closed). Exact usage
// minutes never reach JS, the server, or Anthropic — per Apple's sandbox and
// per the Attend spec's privacy principle. So Attend tracks a coarse ladder
// of daily thresholds plus the user's goal, and derives counselor context
// from crossings only.
//
// The native module only exists in builds that include the config plugin —
// every entry point guards with lazy requires so older builds and Android
// degrade to the manual screen-time log.

export const ATTEND_ACTIVITY = 'attend-daily';
export const ATTEND_SELECTION_ID = 'attend-selection';

// Coarse daily ladder (minutes). Crossings are the only usage signal we get.
export const ATTEND_LADDER = [30, 60, 90, 120, 180, 240, 300];

const KEY_ENABLED = 'attend_enabled';
const KEY_SELECTION = 'attend_family_selection';
const KEY_GOAL_MINUTES = 'attend_goal_minutes';
const KEY_HISTORY = 'attend_daily_history'; // { [YYYY-MM-DD]: { highest: number, overGoal: boolean } }

type DeviceActivityModule = typeof import('react-native-device-activity');

function nativeModule(): DeviceActivityModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-device-activity') as DeviceActivityModule;
    if (typeof mod.isAvailable === 'function' && !mod.isAvailable()) return null;
    return mod;
  } catch {
    return null; // build without the native module
  }
}

export function attendIsSupported(): boolean {
  return nativeModule() !== null;
}

export type AttendAuthStatus = 'unsupported' | 'notDetermined' | 'denied' | 'approved';

export function getAttendAuthStatus(): AttendAuthStatus {
  const mod = nativeModule();
  if (!mod) return 'unsupported';
  try {
    const status = mod.getAuthorizationStatus();
    if (status === 2) return 'approved';
    if (status === 1) return 'denied';
    return 'notDetermined';
  } catch {
    return 'unsupported';
  }
}

export async function requestAttendAuthorization(): Promise<AttendAuthStatus> {
  const mod = nativeModule();
  if (!mod) return 'unsupported';
  try {
    await mod.requestAuthorization('individual');
  } catch (e) {
    console.warn('[attend] authorization request failed:', (e as Error)?.message);
  }
  return getAttendAuthStatus();
}

function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function goalLine(counselor: string, goalMinutes: number): { title: string; body: string } {
  const hours = goalMinutes % 60 === 0 ? `${goalMinutes / 60} hour${goalMinutes === 60 ? '' : 's'}` : `${goalMinutes} minutes`;
  return {
    title: counselor,
    body: `You have crossed the ${hours} you set for yourself today. The rest of the evening is still within your power. Choose it deliberately.`,
  };
}

function wellOverLine(counselor: string): { title: string; body: string } {
  return {
    title: counselor,
    body: 'You are now well past your own line. Not a failure, a signal. Put the glass down and give five minutes to something you will remember.',
  };
}

/**
 * Enable Attend monitoring: a repeating daily schedule with the coarse ladder
 * plus the user's goal threshold (and a "well over" threshold at 1.5x goal).
 * Counselor-voiced notifications fire from the extension for the goal events
 * only, so the ladder can track quietly without spamming.
 */
export async function enableAttend(
  familyActivitySelection: string,
  goalMinutes: number,
  counselorNames: string[]
): Promise<boolean> {
  const mod = nativeModule();
  if (!mod) return false;

  const names = counselorNames.length > 0 ? counselorNames : ['Marcus Aurelius'];
  const goalCounselor = names[new Date().getDay() % names.length];
  const overCounselor = names[(new Date().getDay() + 1) % names.length];

  try {
    try {
      mod.stopMonitoring([ATTEND_ACTIVITY]);
    } catch { /* nothing running yet */ }

    const ladder = [...new Set([...ATTEND_LADDER, goalMinutes, Math.round(goalMinutes * 1.5)])]
      .filter((m) => m >= 15)
      .sort((a, b) => a - b);

    await mod.startMonitoring(
      ATTEND_ACTIVITY,
      {
        intervalStart: { hour: 0, minute: 0, second: 0 },
        intervalEnd: { hour: 23, minute: 59, second: 59 },
        repeats: true,
      },
      ladder.map((minutes) => ({
        eventName: `threshold_${minutes}`,
        familyActivitySelection,
        threshold: { minute: minutes },
        includesPastActivity: true,
      }))
    );

    // Notifications: goal + well-over only.
    mod.configureActions({
      activityName: ATTEND_ACTIVITY,
      callbackName: 'eventDidReachThreshold',
      eventName: `threshold_${goalMinutes}`,
      actions: [{ type: 'sendNotification', payload: goalLine(goalCounselor, goalMinutes) }],
    });
    mod.configureActions({
      activityName: ATTEND_ACTIVITY,
      callbackName: 'eventDidReachThreshold',
      eventName: `threshold_${Math.round(goalMinutes * 1.5)}`,
      actions: [{ type: 'sendNotification', payload: wellOverLine(overCounselor) }],
    });

    await AsyncStorage.multiSet([
      [KEY_ENABLED, 'true'],
      [KEY_SELECTION, familyActivitySelection],
      [KEY_GOAL_MINUTES, String(goalMinutes)],
    ]);
    return true;
  } catch (e) {
    console.warn('[attend] enable failed:', (e as Error)?.message);
    return false;
  }
}

export async function disableAttend(): Promise<void> {
  const mod = nativeModule();
  try {
    mod?.stopMonitoring([ATTEND_ACTIVITY]);
  } catch { /* best effort */ }
  await AsyncStorage.multiRemove([KEY_ENABLED, KEY_SELECTION]);
}

export async function attendIsEnabled(): Promise<boolean> {
  if (!attendIsSupported()) return false;
  return (await AsyncStorage.getItem(KEY_ENABLED)) === 'true';
}

export async function getAttendGoalMinutes(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY_GOAL_MINUTES);
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 15 ? n : 120;
}

export interface AttendTodayStatus {
  connected: boolean;
  /** Highest ladder threshold crossed today, in minutes; 0 = none crossed. */
  highestMinutes: number;
  overGoal: boolean;
  goalMinutes: number;
}

/** Today's coarse status from extension-recorded threshold crossings. */
export async function getAttendTodayStatus(): Promise<AttendTodayStatus> {
  const goalMinutes = await getAttendGoalMinutes();
  const base: AttendTodayStatus = { connected: false, highestMinutes: 0, overGoal: false, goalMinutes };
  const mod = nativeModule();
  if (!mod || !(await attendIsEnabled())) return base;
  try {
    const events = mod.getEvents(ATTEND_ACTIVITY) || [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    let highest = 0;
    for (const ev of events) {
      if (ev.callbackName !== 'eventDidReachThreshold' || !ev.eventName) continue;
      const at = new Date(ev.lastCalledAt);
      if (at < start) continue;
      const m = parseInt(String(ev.eventName).replace('threshold_', ''), 10);
      if (Number.isFinite(m) && m > highest) highest = m;
    }
    return { connected: true, highestMinutes: highest, overGoal: highest >= goalMinutes, goalMinutes };
  } catch (e) {
    console.warn('[attend] status read failed:', (e as Error)?.message);
    return { ...base, connected: true };
  }
}

/** Snapshot today's status into the rolling local history (call on app open). */
export async function recordAttendDay(): Promise<void> {
  try {
    const status = await getAttendTodayStatus();
    if (!status.connected) return;
    const raw = await AsyncStorage.getItem(KEY_HISTORY);
    const history: Record<string, { highest: number; overGoal: boolean }> = raw ? JSON.parse(raw) : {};
    history[todayKey()] = { highest: status.highestMinutes, overGoal: status.overGoal };
    // Keep a rolling 30 days.
    const keys = Object.keys(history).sort();
    while (keys.length > 30) delete history[keys.shift() as string];
    await AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(history));
  } catch { /* best effort */ }
}

// ---------------------------------------------------------------------------
// Cabinet visibility toggles + Focus-session distraction blocking
// ---------------------------------------------------------------------------

const KEY_SHARE_SCREEN = 'attend_share_screen_with_cabinet';    // default on
const KEY_SHARE_ROUTINES = 'attend_share_routines_with_cabinet'; // default on
const KEY_FOCUS_BLOCKLIST = 'attend_focus_blocklist';
const KEY_FOCUS_BLOCK_ENABLED = 'attend_focus_block_enabled';

async function boolSetting(key: string, fallback: boolean): Promise<boolean> {
  const raw = await AsyncStorage.getItem(key);
  return raw === null ? fallback : raw === 'true';
}

export const getShareScreenWithCabinet = () => boolSetting(KEY_SHARE_SCREEN, true);
export const setShareScreenWithCabinet = (v: boolean) => AsyncStorage.setItem(KEY_SHARE_SCREEN, String(v));
export const getShareRoutinesWithCabinet = () => boolSetting(KEY_SHARE_ROUTINES, true);
export const setShareRoutinesWithCabinet = (v: boolean) => AsyncStorage.setItem(KEY_SHARE_ROUTINES, String(v));

export const getFocusBlockEnabled = () => boolSetting(KEY_FOCUS_BLOCK_ENABLED, false);
export const setFocusBlockEnabled = (v: boolean) => AsyncStorage.setItem(KEY_FOCUS_BLOCK_ENABLED, String(v));

export async function setFocusBlocklist(familyActivitySelection: string): Promise<void> {
  await AsyncStorage.setItem(KEY_FOCUS_BLOCKLIST, familyActivitySelection);
}

export async function getFocusBlocklist(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_FOCUS_BLOCKLIST);
}

/**
 * Shield the user's chosen distraction list for the duration of a Focus
 * session. The shield screen (ShieldConfiguration extension) is dressed in
 * the Cabinet's voice. Returns true when a block actually started.
 */
export async function startFocusBlock(): Promise<boolean> {
  const mod = nativeModule();
  if (!mod) return false;
  try {
    if (!(await getFocusBlockEnabled())) return false;
    if (getAttendAuthStatus() !== 'approved') return false;
    const selection = await getFocusBlocklist();
    if (!selection) return false;
    mod.updateShield(
      {
        title: 'The Cabinet holds the door.',
        subtitle: 'You are in a focus session. This can wait until the work is done.',
        primaryButtonLabel: 'Return to focus',
        backgroundColor: { red: 26, green: 26, blue: 46, alpha: 1 },
        titleColor: { red: 224, green: 213, blue: 181, alpha: 1 },
        subtitleColor: { red: 138, green: 155, blue: 176, alpha: 1 },
        primaryButtonBackgroundColor: { red: 201, green: 168, blue: 76, alpha: 1 },
        primaryButtonLabelColor: { red: 26, green: 26, blue: 46, alpha: 1 },
      },
      { primary: { behavior: 'close' } },
      'focus-session'
    );
    mod.blockSelection({ activitySelectionToken: selection }, 'focus-session');
    return true;
  } catch (e) {
    console.warn('[attend] focus block failed:', (e as Error)?.message);
    return false;
  }
}

/** Lift the focus-session shield. Safe to call unconditionally. */
export async function stopFocusBlock(): Promise<void> {
  const mod = nativeModule();
  if (!mod) return;
  try {
    const selection = await getFocusBlocklist();
    if (selection) {
      mod.unblockSelection({ activitySelectionToken: selection }, 'focus-session');
    }
  } catch (e) {
    console.warn('[attend] focus unblock failed:', (e as Error)?.message);
  }
}

/**
 * Coarse usage context for counselor prompts — crossings only, no raw data,
 * per the Attend spec privacy principle. Returns null when Attend is off,
 * there is nothing meaningful to say, or the user has turned Cabinet
 * visibility off in Settings.
 */
export async function buildAttendContext(): Promise<string | null> {
  try {
    if (!(await getShareScreenWithCabinet())) return null;
    if (!(await attendIsEnabled())) return null;
    const goalMinutes = await getAttendGoalMinutes();
    const today = await getAttendTodayStatus();
    const raw = await AsyncStorage.getItem(KEY_HISTORY);
    const history: Record<string, { highest: number; overGoal: boolean }> = raw ? JSON.parse(raw) : {};

    const last7 = Object.entries(history).sort().slice(-7);
    const overDays = last7.filter(([, v]) => v.overGoal).length;

    const goalText = goalMinutes % 60 === 0 ? `${goalMinutes / 60}h` : `${goalMinutes}m`;
    const lines = [
      '[ATTEND CONTEXT — the user shares coarse Screen Time signals with you]',
      `Daily screen-time goal: ${goalText}.`,
      today.connected
        ? today.highestMinutes > 0
          ? `Today: phone use has crossed the ${today.highestMinutes >= 60 ? `${Math.floor(today.highestMinutes / 60)}h${today.highestMinutes % 60 ? ` ${today.highestMinutes % 60}m` : ''}` : `${today.highestMinutes}m`} mark${today.overGoal ? ' — OVER their goal' : ' (still under their goal)'}.`
          : 'Today: no usage thresholds crossed yet.'
        : 'Today: no signal.',
      last7.length >= 3 ? `Past week: over their goal on ${overDays} of the last ${last7.length} tracked days.` : '',
      'If phone use, attention, or distraction is relevant, you may speak to these patterns in your own voice — as one who has been watching, not auditing. Never cite exact numbers beyond these, never mention "Screen Time" or "Attend" by name.',
      '[END ATTEND CONTEXT]',
    ].filter(Boolean);
    return lines.join('\n');
  } catch {
    return null;
  }
}
