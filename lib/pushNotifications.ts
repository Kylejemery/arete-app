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
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[push] permission not granted');
      return null;
    }

    // Android channel must exist before notifications can use it.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-dispatch', {
        name: 'Daily Dispatch',
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
 * One-shot setup run after authentication: detect timezone, register for push,
 * and persist the token. Best-effort — failures are logged, never thrown, so a
 * denied permission or offline launch can't break app boot.
 */
export async function setupDispatchNotifications(session: Session): Promise<void> {
  await saveTimezone(session);
  const token = await registerForPushNotifications();
  if (token) await savePushToken(token, session);
}
