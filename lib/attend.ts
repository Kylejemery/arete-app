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
export const ATTEND_NIGHT_ACTIVITY = 'attend-night';
export const ATTEND_SELECTION_ID = 'attend-selection';

// Coarse daily ladder (minutes). Crossings are the only usage signal we get.
export const ATTEND_LADDER = [30, 60, 90, 120, 180, 240, 300];

// Late-night window (23:00–05:00): its own monitor with a finer ladder,
// because 15 minutes at 1am says more than an hour at noon.
export const ATTEND_NIGHT_LADDER = [15, 30, 60, 120];

const KEY_ENABLED = 'attend_enabled';
const KEY_SELECTION = 'attend_family_selection';
const KEY_GOAL_MINUTES = 'attend_goal_minutes';
const KEY_HISTORY = 'attend_daily_history'; // { [YYYY-MM-DD]: { highest: number, overGoal: boolean } }
const KEY_NIGHT_HISTORY = 'attend_night_history'; // { [YYYY-MM-DD of the morning]: highest minutes }

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
      mod.stopMonitoring([ATTEND_ACTIVITY, ATTEND_NIGHT_ACTIVITY]);
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

    // Late-night monitor: same selection, 23:00–05:00 (DeviceActivity
    // supports overnight intervals), finer ladder, no notifications — it
    // feeds counselor context quietly. Failure here never takes down the
    // daily monitor.
    try {
      await mod.startMonitoring(
        ATTEND_NIGHT_ACTIVITY,
        {
          intervalStart: { hour: 23, minute: 0, second: 0 },
          intervalEnd: { hour: 5, minute: 0, second: 0 },
          repeats: true,
        },
        ATTEND_NIGHT_LADDER.map((minutes) => ({
          eventName: `night_${minutes}`,
          familyActivitySelection,
          threshold: { minute: minutes },
          includesPastActivity: true,
        }))
      );
    } catch (e) {
      console.warn('[attend] night monitor failed:', (e as Error)?.message);
    }

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
    mod?.stopMonitoring([ATTEND_ACTIVITY, ATTEND_NIGHT_ACTIVITY]);
  } catch { /* best effort */ }
  await AsyncStorage.multiRemove([KEY_ENABLED, KEY_SELECTION]);
}

export async function attendIsEnabled(): Promise<boolean> {
  if (!attendIsSupported()) return false;
  return (await AsyncStorage.getItem(KEY_ENABLED)) === 'true';
}

/**
 * Re-arm monitoring with a new goal using the stored selection. Thresholds
 * are baked in at startMonitoring time, so a goal change must restart the
 * monitor. No-op (false) when Attend isn't connected.
 */
export async function updateAttendGoal(goalMinutes: number, counselorNames: string[]): Promise<boolean> {
  if (!(await attendIsEnabled())) return false;
  const selection = await AsyncStorage.getItem(KEY_SELECTION);
  if (!selection) return false;
  return enableAttend(selection, goalMinutes, counselorNames);
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

/**
 * Highest late-night threshold crossed in the most recent night window
 * (events within the last 24h), in minutes; 0 = clean night or no data.
 */
export async function getAttendNightStatus(): Promise<number> {
  const mod = nativeModule();
  if (!mod || !(await attendIsEnabled())) return 0;
  try {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    let highest = 0;
    for (const ev of mod.getEvents(ATTEND_NIGHT_ACTIVITY) || []) {
      if (ev.callbackName !== 'eventDidReachThreshold' || !ev.eventName) continue;
      if (new Date(ev.lastCalledAt).getTime() < cutoff) continue;
      const m = parseInt(String(ev.eventName).replace('night_', ''), 10);
      if (Number.isFinite(m) && m > highest) highest = m;
    }
    return highest;
  } catch {
    return 0;
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

    // Night history, keyed by the morning it ended on.
    const night = await getAttendNightStatus();
    const nraw = await AsyncStorage.getItem(KEY_NIGHT_HISTORY);
    const nights: Record<string, number> = nraw ? JSON.parse(nraw) : {};
    nights[todayKey()] = Math.max(nights[todayKey()] ?? 0, night);
    const nkeys = Object.keys(nights).sort();
    while (nkeys.length > 30) delete nights[nkeys.shift() as string];
    await AsyncStorage.setItem(KEY_NIGHT_HISTORY, JSON.stringify(nights));
  } catch { /* best effort */ }
}

// ---------------------------------------------------------------------------
// Watchlists — named app groups with their own threshold ladders, so the
// Cabinet can call out "Instagram crossed 2h" by the name the USER gave the
// list. Apple's picker returns opaque tokens (the app never learns real app
// names); the label is the user's own, which is what makes the callout
// possible at all. iOS caps concurrent DeviceActivity monitors, so watchlists
// are limited to 5.
// ---------------------------------------------------------------------------

const KEY_WATCHLISTS = 'attend_watchlists';
export const MAX_WATCHLISTS = 5;

export interface AttendWatchlist {
  id: string;
  label: string;
  selection: string;
}

export async function getWatchlists(): Promise<AttendWatchlist[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_WATCHLISTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const watchActivityName = (id: string) => `attend-watch-${id}`;

export async function addWatchlist(label: string, selection: string): Promise<boolean> {
  const mod = nativeModule();
  if (!mod) return false;
  const lists = await getWatchlists();
  if (lists.length >= MAX_WATCHLISTS) return false;
  const id = `${Date.now().toString(36)}`;
  try {
    await mod.startMonitoring(
      watchActivityName(id),
      {
        intervalStart: { hour: 0, minute: 0, second: 0 },
        intervalEnd: { hour: 23, minute: 59, second: 59 },
        repeats: true,
      },
      ATTEND_LADDER.map((minutes) => ({
        eventName: `threshold_${minutes}`,
        familyActivitySelection: selection,
        threshold: { minute: minutes },
        includesPastActivity: true,
      }))
    );
    await AsyncStorage.setItem(
      KEY_WATCHLISTS,
      JSON.stringify([...lists, { id, label: label.trim().slice(0, 30), selection }])
    );
    return true;
  } catch (e) {
    console.warn('[attend] addWatchlist failed:', (e as Error)?.message);
    return false;
  }
}

export async function removeWatchlist(id: string): Promise<void> {
  const mod = nativeModule();
  try {
    mod?.stopMonitoring([watchActivityName(id)]);
  } catch { /* best effort */ }
  const lists = await getWatchlists();
  await AsyncStorage.setItem(KEY_WATCHLISTS, JSON.stringify(lists.filter((w) => w.id !== id)));
}

/** Today's highest crossed threshold per watchlist, in minutes (0 = none). */
export async function getWatchlistTodayStatus(): Promise<{ label: string; highestMinutes: number }[]> {
  const mod = nativeModule();
  const lists = await getWatchlists();
  if (!mod || lists.length === 0) return [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return lists.map((w) => {
    let highest = 0;
    try {
      for (const ev of mod.getEvents(watchActivityName(w.id)) || []) {
        if (ev.callbackName !== 'eventDidReachThreshold' || !ev.eventName) continue;
        if (new Date(ev.lastCalledAt) < start) continue;
        const m = parseInt(String(ev.eventName).replace('threshold_', ''), 10);
        if (Number.isFinite(m) && m > highest) highest = m;
      }
    } catch { /* leave at 0 */ }
    return { label: w.label, highestMinutes: highest };
  });
}

function fmtMinutes(m: number): string {
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`;
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

// Typed website blocklist — Apple's FamilyActivityPicker cannot take a typed
// URL, but the ManagedSettings web-content filter can: these domains are
// blocked in Safari for the duration of a Focus session.
const KEY_BLOCKED_DOMAINS = 'attend_blocked_domains';

export async function getBlockedDomains(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_BLOCKED_DOMAINS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Normalize "https://www.reddit.com/r/all" → "reddit.com". */
export function normalizeDomain(input: string): string | null {
  const cleaned = input.trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0];
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(cleaned) ? cleaned : null;
}

export async function addBlockedDomain(input: string): Promise<string[] | null> {
  const domain = normalizeDomain(input);
  if (!domain) return null;
  const domains = await getBlockedDomains();
  if (!domains.includes(domain)) domains.push(domain);
  await AsyncStorage.setItem(KEY_BLOCKED_DOMAINS, JSON.stringify(domains));
  return domains;
}

export async function removeBlockedDomain(domain: string): Promise<string[]> {
  const domains = (await getBlockedDomains()).filter((d) => d !== domain);
  await AsyncStorage.setItem(KEY_BLOCKED_DOMAINS, JSON.stringify(domains));
  return domains;
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
    const domains = await getBlockedDomains();
    if (!selection && domains.length === 0) return false;
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
    if (selection) {
      mod.blockSelection({ activitySelectionToken: selection }, 'focus-session');
    }
    if (domains.length > 0) {
      mod.setWebContentFilterPolicy({ type: 'specific', domains }, 'focus-session');
    }
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
    mod.clearWebContentFilterPolicy('focus-session');
  } catch (e) {
    console.warn('[attend] focus unblock failed:', (e as Error)?.message);
  }
}

/**
 * Coarse usage context for counselor prompts — crossings only, no raw data,
 * per the Attend spec privacy principle. Always returns a block so the
 * Cabinet is never silently blind about screen time: when the signals are
 * unavailable (unsupported device, Attend not connected, visibility turned
 * off, or the caller says this tier cannot see them), the block says exactly
 * what the counselors cannot see, so a direct "how's my screen time?" gets
 * an honest answer instead of an invented number.
 *
 * @param cabinetCanSee whether this user's tier lets the Cabinet see the
 * signals (the premium half of Attend). Defaults to true for callers that
 * do their own gating.
 */
export async function buildAttendContext(cabinetCanSee: boolean = true): Promise<string> {
  const wrap = (lines: string[]) =>
    ['[ATTEND CONTEXT — Screen Time]', ...lines.filter(Boolean), '[END ATTEND CONTEXT]'].join('\n');
  const noData = (reason: string) =>
    wrap([
      reason,
      'If the user asks about their screen time, say honestly that you cannot see it and why. Never invent or estimate usage numbers.',
    ]);
  try {
    if (!attendIsSupported()) {
      return noData('You cannot see their screen time: monitoring is not available on this device.');
    }
    if (!(await attendIsEnabled())) {
      return noData('You cannot see their screen time: they have not connected Screen Time monitoring (it can be connected on the Progress tab).');
    }
    if (!(await getShareScreenWithCabinet())) {
      return noData('You cannot see their screen time: they chose in Settings not to share it with the Cabinet. Respect that choice without comment unless asked.');
    }
    if (!cabinetCanSee) {
      return noData('You cannot see their screen time: Cabinet visibility of Screen Time signals is part of Arete Premium, and they are on the free tier.');
    }
    const goalMinutes = await getAttendGoalMinutes();
    const today = await getAttendTodayStatus();
    const raw = await AsyncStorage.getItem(KEY_HISTORY);
    const history: Record<string, { highest: number; overGoal: boolean }> = raw ? JSON.parse(raw) : {};

    const last7 = Object.entries(history).sort().slice(-7);
    const overDays = last7.filter(([, v]) => v.overGoal).length;

    const goalText = goalMinutes % 60 === 0 ? `${goalMinutes / 60}h` : `${goalMinutes}m`;
    const watchStatus = await getWatchlistTodayStatus();
    const watchLines = watchStatus
      .filter((w) => w.highestMinutes > 0)
      .map((w) => `Their "${w.label}" watchlist crossed the ${fmtMinutes(w.highestMinutes)} mark today.`);

    // Late-night window: last night + how many of the last 7 nights.
    const nightHighest = await getAttendNightStatus();
    const nraw = await AsyncStorage.getItem(KEY_NIGHT_HISTORY);
    const nights: Record<string, number> = nraw ? JSON.parse(nraw) : {};
    const last7Nights = Object.entries(nights).sort().slice(-7);
    const lateNights = last7Nights.filter(([, m]) => m > 0).length;
    const nightLines = [
      nightHighest > 0
        ? `Last night: phone use between 11pm and 5am crossed the ${fmtMinutes(nightHighest)} mark.`
        : '',
      last7Nights.length >= 3 && lateNights > 0
        ? `Late-night phone use (past 11pm) on ${lateNights} of the last ${last7Nights.length} tracked nights.`
        : '',
    ];

    return wrap([
      'The user shares coarse Screen Time signals with you (threshold crossings only — you never see exact minutes).',
      `Their self-set daily limit: ${goalText}.`,
      today.connected
        ? today.highestMinutes > 0
          ? `Today: phone use has crossed the ${fmtMinutes(today.highestMinutes)} mark — ${today.overGoal ? 'they went OVER their limit today' : 'still under their limit'}.`
          : 'Today: no usage thresholds crossed yet — well under their limit so far.'
        : 'Today: no signal yet.',
      ...watchLines,
      ...nightLines,
      last7.length >= 3 ? `Past week: over their limit on ${overDays} of the last ${last7.length} tracked days.` : '',
      'When the user asks directly about their screen time, answer plainly from the lines above. If they are over their limit, tell them straight — e.g. "You went over your limit today." — then speak to it in your own voice. If under, tell them they are still within it. Only your precision is limited (crossings, not exact minutes), never your honesty.',
      'When they have NOT asked, you may still speak to phone use, attention, or distraction where relevant — as one who has been watching, not auditing. Do not volunteer numbers beyond these thresholds, and do not mention the feature name "Attend."',
    ]);
  } catch {
    return noData('You cannot see their screen time right now: the signals could not be read.');
  }
}
