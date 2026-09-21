// Every gate that can open the paywall, by name. The union is the contract
// between the gates, the paywall's source-specific copy (app/paywall.tsx),
// the paywall_events and product_events rows, and the web /upgrade page:
// a source string that is not listed here fails to compile.
//
// web/src/lib/paywall.ts carries the same list for the web app. There is no
// package shared by both builds, so change both files together.
export const PAYWALL_SOURCES = [
  // Cabinet and counselors
  'cabinet_daily_limit',
  'cabinet_limit_card',
  'counselor_daily_limit',
  'locked_counselor',
  'custom_cabinet',
  'cabinet_select_locked',
  'cabinet_minds',
  // Shared sessions
  'shared_daily_limit',
  'shared_invite_gate',
  'shared_guest_banner',
  // Journal, progress, library, agora
  'insight_tease',
  'library_margin_note',
  'symposium_daily_limit',
  'agora_comment',
  'agora_submit',
  // Cabinet sight (Attend, Health, Calendar) and What's New
  'attend_cabinet_sight',
  'attend_context_tease',
  'attend_watchlists',
  'attend_focus_block',
  'health_cabinet_sight',
  'calendar_cabinet_sight',
  'whats_new_cabinet_sight',
  // Settings
  'settings_upgrade',
] as const;

export type PaywallSource = (typeof PAYWALL_SOURCES)[number];

export function isPaywallSource(value: unknown): value is PaywallSource {
  return typeof value === 'string' && (PAYWALL_SOURCES as readonly string[]).includes(value);
}

// The route object for router.push / router.replace. Typed as any on the way
// out because expo-router's typed routes do not know the paywall's params;
// the argument is what matters, and it is checked.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function paywallRoute(src: PaywallSource): any {
  return { pathname: '/paywall', params: { src } };
}
