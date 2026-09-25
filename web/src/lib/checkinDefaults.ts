// Default morning check-in tasks (activation run B, Part B4). The original
// three (Eat breakfast, Train with a boxing glove, Meditate) were one
// person's routine, and most people never changed them. Accounts created on
// or after NEUTRAL_DEFAULTS_SINCE get neutral defaults; older accounts keep
// the defaults they have always had. Mirrored in web/src/lib/checkinDefaults.ts and lib/checkinDefaults.ts.
export const NEUTRAL_DEFAULTS_SINCE = '2026-09-25T00:00:00Z';

export interface DefaultTask {
  title: string;
  emoji: string;
}

export const NEUTRAL_MORNING_DEFAULTS: DefaultTask[] = [
  { title: 'Move your body', emoji: '🏃' },
  { title: 'Something for your mind', emoji: '📖' },
  { title: 'One thing for someone else', emoji: '🤝' },
];

export const LEGACY_MORNING_DEFAULTS: DefaultTask[] = [
  { title: 'Eat breakfast', emoji: '🍳' },
  { title: 'Train', emoji: '🥊' },
  { title: 'Meditate', emoji: '🌿' },
];

export function morningDefaultsFor(accountCreatedAt: string | null | undefined): DefaultTask[] {
  const t = accountCreatedAt ? Date.parse(accountCreatedAt) : NaN;
  // Unknown creation time: treat as new, so nobody new inherits the old routine.
  if (!Number.isFinite(t) || t >= Date.parse(NEUTRAL_DEFAULTS_SINCE)) return NEUTRAL_MORNING_DEFAULTS;
  return LEGACY_MORNING_DEFAULTS;
}
