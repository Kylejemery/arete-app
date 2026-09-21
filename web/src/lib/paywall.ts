// Every gate that can open the paywall, by name. Mirror of lib/paywall.ts in
// the mobile app (no package is shared by both builds; change both files
// together). A source string not listed here fails to compile, and the
// /upgrade page and paywall_viewed events key on these values.
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

// The href every upgrade link and redirect should use, so the source
// survives into the /upgrade page, the paywall_viewed event, and (R11) the
// Stripe checkout metadata.
export function upgradeHref(src: PaywallSource): string {
  return `/upgrade?src=${encodeURIComponent(src)}`;
}
