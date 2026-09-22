// Product event log (retention plan R0). One append-only stream,
// product_events, written by mobile, web and server. This is the mobile
// writer: it never throws and never blocks a screen. Rows insert under RLS
// as the signed in user, so anonymous events are dropped.
//
// Event names are a closed union so a typo fails to compile. Add to it when a
// later ticket wires a new event; keep web/src/lib/events.ts in step.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

export type ProductEvent =
  | 'signup_completed'
  | 'app_opened'
  | 'checkin_completed'
  | 'checkin_cabinet_failed'
  | 'kt_started'
  | 'kt_completed'
  | 'gate_hit'
  | 'paywall_viewed'
  | 'push_prompt_shown'
  | 'push_permission_granted'
  | 'push_permission_denied'
  | 'reminders_scheduled'
  | 'dispatch_opened';

export type EventProps = Record<string, string | number | boolean | null | undefined>;

const APP_VERSION: string | null = Constants.expoConfig?.version ?? null;

// Awaitable variant, for the rare call site that navigates away immediately
// afterwards (sign up). Still swallows every failure.
export async function logEventNow(event: ProductEvent, props: EventProps = {}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('product_events').insert({
      user_id: user.id,
      event,
      props: stripUndefined(props),
      platform: Platform.OS,
      app_version: APP_VERSION,
    });
    if (error && __DEV__) console.warn('[events] insert failed:', error.message);
  } catch (e) {
    if (__DEV__) console.warn('[events] logEvent threw:', e);
  }
}

// Fire and forget. This is the one to use almost everywhere.
export function logEvent(event: ProductEvent, props: EventProps = {}): void {
  void logEventNow(event, props);
}

// Count the Know Thyself fields a user actually filled, for kt_completed.
export function countFilled(values: Record<string, string | number | null | undefined>): number {
  return Object.values(values).filter(v => typeof v === 'number' ? Number.isFinite(v) : !!(v && String(v).trim())).length;
}

function stripUndefined(props: EventProps): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props)) if (v !== undefined) out[k] = v;
  return out;
}
