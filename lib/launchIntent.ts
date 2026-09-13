import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Records that the app is navigating somewhere because the user tapped a
// notification, so the tab layout's time-of-day routine redirect (Morning
// before noon, Evening after 5pm) stands down. Without this, a cold start
// from a 7am counselor reminder or the Daily Dispatch push landed on the
// Morning tab instead of the thing the notification was about.

let lastNotificationNavigationAt = 0;

export function markNotificationNavigation(): void {
  lastNotificationNavigationAt = Date.now();
}

export function hasRecentNotificationNavigation(withinMs = 15_000): boolean {
  return Date.now() - lastNotificationNavigationAt < withinMs;
}

// expo-notifications reports the delivery time in seconds on iOS; guard
// against a millisecond value in case a platform reports it that way.
function toMs(date: unknown): number {
  const n = typeof date === 'number' ? date : Number(date);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1e12 ? n : n * 1000;
}

function isRoutableNotification(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as { type?: unknown; route?: unknown };
  return d.type === 'daily_dispatch' || d.route === '/cabinet';
}

/**
 * True when the app was just opened by tapping a notification that the tap
 * handler will route. Covers both orders the cold-start race can take: the
 * tap handler already pushed (flag set), or the tab layout mounted first and
 * the handler's async lookup has not resolved yet (ask the OS directly).
 */
export async function wasLaunchedFromNotification(): Promise<boolean> {
  if (hasRecentNotificationNavigation()) return true;
  if (Platform.OS === 'web') return false;
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return false;
    const content = response.notification?.request?.content;
    if (!isRoutableNotification(content?.data)) return false;
    const deliveredAt = toMs(response.notification?.date);
    // The last response persists for the life of the process; only a tap
    // from the last minute counts as "launched from".
    return deliveredAt > 0 && Date.now() - deliveredAt < 60_000;
  } catch {
    return false;
  }
}
