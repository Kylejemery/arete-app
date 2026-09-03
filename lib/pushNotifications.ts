// lib/pushNotifications.ts
//
// Push-notification registration + timezone detection for the Daily Dispatch
// Agent. Called once after the user is authenticated (see _layout.tsx). All
// native calls are deferred to runtime — never module scope — to avoid the
// TurboModule init crash that bit us in Build 44.

import * as Notifications from 'expo-notifications';
import { getCalendars } from 'expo-localization';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { API_BASE_URL } from '../services/claudeService';

const EAS_PROJECT_ID = '84e0593d-d728-4e1a-b522-f8d51ce8a069';

/**
 * Requests notification permission (if not already granted), creates the
 * Android dispatch channel, and returns the Expo push token — or null when
 * permission is denied or the platform can't issue one (web, simulator).
 */
export async function registerForPushNotifications(
  options: { requestIfNeeded?: boolean } = {}
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted' && options.requestIfNeeded) {
      // iOS shows its system prompt exactly once, so this should only run
      // from a primed UI moment (see DispatchNudge), never cold at boot.
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[push] permission not granted');
      return null;
    }

    // Android channels must exist before notifications can use them. Both are
    // (re)created on every registration, so a member who installed before a
    // channel existed picks it up on their next launch.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-dispatch', {
        name: 'Daily Dispatch',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
      // Broadcasts: a message from a counselor, separable in Android settings
      // from the morning dispatch because it is a different kind of thing.
      await Notifications.setNotificationChannelAsync('counselor-messages', {
        name: 'Messages from your Cabinet',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const token = (
      await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })
    ).data;
    return token || null;
  } catch (e) {
    console.log('[push] registration failed:', (e as Error)?.message);
    return null;
  }
}

/** Persists the Expo push token to user_settings via the Railway backend. */
export async function savePushToken(token: string, session: Session): Promise<void> {
  if (!token || !session?.access_token) return;
  try {
    await fetch(`${API_BASE_URL}/api/user/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch (e) {
    console.log('[push] savePushToken failed:', (e as Error)?.message);
  }
}

/** Detects the device IANA timezone and saves it to user_settings. */
export async function saveTimezone(session: Session): Promise<void> {
  if (!session?.access_token) return;
  try {
    const calendars = getCalendars();
    const timezone = calendars[0]?.timeZone || 'America/New_York';
    await fetch(`${API_BASE_URL}/api/user/timezone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ timezone }),
    });
  } catch (e) {
    console.log('[push] saveTimezone failed:', (e as Error)?.message);
  }
}

/**
 * One-shot setup run after authentication: detect timezone and, when
 * notification permission is ALREADY granted, refresh + persist the push
 * token. Deliberately never triggers the iOS permission prompt — cold-boot
 * prompts with no context get denied, and iOS never re-asks (this is why only
 * ~a quarter of users had tokens). The DispatchNudge card owns the ask.
 * Best-effort — failures are logged, never thrown.
 */
export async function setupDispatchNotifications(session: Session): Promise<void> {
  await saveTimezone(session);
  const token = await registerForPushNotifications({ requestIfNeeded: false });
  if (token) await savePushToken(token, session);
}

/**
 * The primed ask: request permission (system prompt fires here, from a UI
 * moment that just explained why) and register + persist on grant. Returns
 * whether a token was saved.
 */
export async function promptAndRegisterForDispatch(session: Session): Promise<boolean> {
  const token = await registerForPushNotifications({ requestIfNeeded: true });
  if (token) {
    await savePushToken(token, session);
    return true;
  }
  return false;
}

/** Current notification permission, for deciding whether to show the nudge. */
export async function getPushPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') return 'denied';
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'undetermined' || canAskAgain) return 'undetermined';
    return 'denied';
  } catch {
    return 'denied';
  }
}
