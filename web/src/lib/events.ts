// Product event log (retention plan R0), web writer. Mirror of lib/events.ts
// in the mobile app: it never throws and never blocks the page. Rows insert
// under RLS as the signed in user, so anonymous events are dropped. Event
// names are a closed union so a typo fails to compile.
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
  | 'dispatch_opened'
  | 'kt_reflection_viewed'
  | 'kt_reflection_answered'
  | 'kt_field_filled'
  | 'cabinet_starter_used'
  | 'kt_fact_removed'
  | 'kt_abandoned'
  | 'home_yesterday_card_viewed'
  | 'home_yesterday_card_tapped'
  | 'checkin_continue_tapped'
  | 'module_limit_upgrade_click'
  | 'onboarding_step_viewed'
  | 'onboarding_committed';

export type EventProps = Record<string, string | number | boolean | null | undefined>;

// Vercel stamps the commit sha into the build; locally there is none.
const APP_VERSION: string | null = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;

// Awaitable variant, for the rare call site that does a full page navigation
// immediately afterwards (sign up), which would cancel a pending insert.
// Still swallows every failure.
export async function logEventNow(event: ProductEvent, props: EventProps = {}): Promise<void> {
  if (typeof window === 'undefined') return; // client only
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('product_events').insert({
      user_id: user.id,
      event,
      props: stripUndefined(props),
      platform: 'web',
      app_version: APP_VERSION,
    });
    if (error && process.env.NODE_ENV !== 'production') console.warn('[events] insert failed:', error.message);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.warn('[events] logEvent threw:', e);
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
