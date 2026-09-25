// Paywall copy shared by the mobile paywall (app/paywall.tsx) and the web
// /upgrade page (retention plan R11). lib/paywallCopy.ts in the mobile app
// is the same file; there is no package shared by both builds, so change
// both together. Keys are PaywallSource values (lib/paywall.ts).

export interface PaywallHeaderCopy {
  title: string;
  subtitle: string;
}

// What Premium is, in outcomes rather than feature names. Shown above the
// plans on both paywalls. The Stripe product description in the dashboard
// should say the same thing.
export const PREMIUM_BENEFITS: string[] = [
  'Five counselors answer together, and disagree with each other.',
  '50 messages a day, with longer and deeper replies.',
  'Your full Weekly Insight, not the three line preview.',
  'Build your own Cabinet from all 23 counselors.',
  'Let your Cabinet see your sleep, calendar and screen time, and hold you to them.',
];

// A daily limit mid conversation (activation 7.1, retention plan R1): the
// header speaks to that exact conversation and names the counselor.
export const LIMIT_SOURCES: ReadonlySet<string> = new Set([
  'cabinet_daily_limit',
  'cabinet_limit_card',
  'counselor_daily_limit',
]);

export function limitHeaderCopy(counselor?: string | null): PaywallHeaderCopy {
  const who = counselor ? String(counselor).slice(0, 40) : 'your Cabinet';
  return {
    title: `Keep talking with ${who}`,
    subtitle: 'Your conversation is saved exactly where you left off, your unsent message included. Premium picks it up from there.',
  };
}

// Source specific headline copy: whoever arrives from a tease lands on a
// paywall that speaks to the exact thing they just reached for. Sources not
// listed fall back to the generic header.
export const SOURCE_COPY: Record<string, PaywallHeaderCopy> = {
  insight_tease: {
    title: 'See the whole pattern',
    subtitle: 'Your counselors noticed something in your week. Premium shows the full pattern: what they saw, where it shows up in your check ins, and one thing to try.',
  },
  locked_counselor: {
    title: 'Bring them to the table',
    subtitle: 'Free seats three counselors. Premium opens all 23, in the Cabinet and one on one.',
  },
  custom_cabinet: {
    title: 'Build your own Cabinet',
    subtitle: 'Choose three to five voices from all 23 counselors, and change them whenever your life does.',
  },
  cabinet_select_locked: {
    title: 'Bring them to the table',
    subtitle: 'Free seats three counselors. Premium opens all 23, in the Cabinet and one on one.',
  },
  cabinet_minds: {
    title: 'Choose each counselor\'s mind',
    subtitle: 'Premium lets you pick the model behind every voice, for deeper and longer replies.',
  },
  shared_daily_limit: {
    title: 'Keep the session going',
    subtitle: 'Shared sessions pause at the free limit. Premium keeps both of you talking with the Cabinet.',
  },
  shared_invite_gate: {
    title: 'Bring someone to the table',
    subtitle: 'Premium members host shared sessions: you and a partner, each with your own profile, one Cabinet answering both.',
  },
  shared_guest_banner: {
    title: 'Host your own sessions',
    subtitle: 'You were a guest this time. Premium lets you invite anyone into your Cabinet.',
  },
  library_margin_note: {
    title: 'The corpus writes in the margins',
    subtitle: 'Premium readers get the corpus\'s own notes beside every passage in the Library.',
  },
  symposium_daily_limit: {
    title: 'Keep the dialogue going',
    subtitle: 'Free allows five Symposium dialogues a day. Premium allows fifty.',
  },
  module_limit: {
    title: 'Keep every practice',
    subtitle: 'Free keeps one practice on Home at a time. Premium keeps all you choose, each tuned your way.',
  },
  attend_cabinet_sight: {
    title: 'Let them see your hours',
    subtitle: 'Your counselors see your screen time signals and hold you to the limit you set yourself.',
  },
  attend_context_tease: {
    title: 'They could see this',
    subtitle: 'Your counselors see your screen time signals and hold you to the limit you set yourself.',
  },
  attend_watchlists: {
    title: 'Name your distractions',
    subtitle: 'Watchlists let the Cabinet call it out by name: "your Instagram list crossed two hours today."',
  },
  attend_focus_block: {
    title: 'The Cabinet holds the door',
    subtitle: 'Your chosen apps and websites stay shielded for the length of every focus session.',
  },
  health_cabinet_sight: {
    title: 'Let them see your nights',
    subtitle: 'Sleep, steps, and training: your counselors speak to the day you actually lived.',
  },
  calendar_cabinet_sight: {
    title: 'Let them see your day',
    subtitle: 'Your counselors read today\'s calendar and hold it beside the things you said matter.',
  },
  agora_comment: {
    title: 'Write in the Agora',
    subtitle: 'Reading the Agora is free. Commenting on an essay, and submitting your own, is for subscribers.',
  },
  agora_submit: {
    title: 'Write for the Agora',
    subtitle: 'Subscribers submit essays. An editor reads every one before it appears, open to argument.',
  },
  whats_new_cabinet_sight: {
    title: 'The Cabinet sees more',
    subtitle: 'Screen time, sleep, and your calendar: counselors who speak to the day you actually lived.',
  },
  settings_upgrade: {
    title: 'Everything Premium opens',
    subtitle: 'More counselors, more conversations, and a Cabinet that sees the day you actually lived.',
  },
};

// The header for a paywall opened from `src`. Limit sources name the
// counselor; other known sources use SOURCE_COPY; anything else gets null
// and the caller shows its generic header.
export function headerCopyForSource(src: string | null | undefined, counselor?: string | null): PaywallHeaderCopy | null {
  const key = String(src ?? '');
  if (LIMIT_SOURCES.has(key)) return limitHeaderCopy(counselor);
  return SOURCE_COPY[key] ?? null;
}

// The first sentence of an insight, for the free tier Journal tease
// (audit section 5.3). Falls back to the whole text when no sentence end
// is found.
export function firstSentence(text: string): string {
  const trimmed = String(text ?? '').trim();
  const match = trimmed.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (match ? match[0] : trimmed).trim();
}
