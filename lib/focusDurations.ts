import AsyncStorage from '@react-native-async-storage/async-storage';

// Focus (pomodoro) lengths, in minutes. The timer tab used to hardcode
// 25 work / 5 break; these are now user-adjustable and remembered on the
// device. The web twin keeps the same shape under the same key in
// localStorage (web/src/app/focus/page.tsx).
export const FOCUS_DURATIONS_KEY = 'arete:focus_durations';
export const MIN_FOCUS_MINUTES = 1;
export const MAX_FOCUS_MINUTES = 180;

export type FocusMode = 'work' | 'break';
export type FocusDurations = Record<FocusMode, number>;

export const DEFAULT_FOCUS_DURATIONS: FocusDurations = { work: 25, break: 5 };

/** Whole minutes within the allowed range, or null when the input is unusable. */
export function parseFocusMinutes(raw: string | number): number | null {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n)) return null;
  const whole = Math.round(n);
  if (whole < MIN_FOCUS_MINUTES || whole > MAX_FOCUS_MINUTES) return null;
  return whole;
}

export async function getFocusDurations(): Promise<FocusDurations> {
  try {
    const raw = await AsyncStorage.getItem(FOCUS_DURATIONS_KEY);
    if (!raw) return DEFAULT_FOCUS_DURATIONS;
    const parsed = JSON.parse(raw);
    const work = parseFocusMinutes(parsed?.work);
    const brk = parseFocusMinutes(parsed?.break);
    return {
      work: work ?? DEFAULT_FOCUS_DURATIONS.work,
      break: brk ?? DEFAULT_FOCUS_DURATIONS.break,
    };
  } catch {
    return DEFAULT_FOCUS_DURATIONS;
  }
}

export async function setFocusDurations(durations: FocusDurations): Promise<void> {
  try {
    await AsyncStorage.setItem(FOCUS_DURATIONS_KEY, JSON.stringify(durations));
  } catch {
    // Best effort: the in-memory value still applies for this launch.
  }
}
