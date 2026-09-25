// Practice modules (personalization run C). Mirror of the server registry in
// server/lib/module-registry.js, which is the source of truth: it validates
// settings, applies exclusions and the free-tier limit. This copy only names
// modules and their free-text field for display. lib/modules.ts (mobile) is
// the same list; a server test checks all three carry the same keys.
export type ModuleKey = 'focus_timer' | 'evening_review' | 'premeditatio' | 'habit_tracker';

export interface ModuleInfo {
  key: ModuleKey;
  label: string;
  tier: 'surface_existing' | 'enable_module';
  freeTextField: string;
  freeTextLabel: string;
  freeTextPlaceholder: string;
}

export const MODULES: ModuleInfo[] = [
  { key: 'focus_timer', label: 'Focus timer', tier: 'surface_existing', freeTextField: 'intention', freeTextLabel: 'What the time is for', freeTextPlaceholder: 'Deep work on the thesis' },
  { key: 'evening_review', label: 'Evening review', tier: 'surface_existing', freeTextField: 'question', freeTextLabel: 'Your closing question', freeTextPlaceholder: 'Where did I act from fear today?' },
  { key: 'premeditatio', label: 'Premeditatio', tier: 'enable_module', freeTextField: 'focus', freeTextLabel: 'What to prepare for', freeTextPlaceholder: 'The hard conversation at work' },
  { key: 'habit_tracker', label: 'Habit tracker', tier: 'enable_module', freeTextField: 'habit', freeTextLabel: 'Your habit', freeTextPlaceholder: 'Twenty minutes of reading' },
];

export function moduleInfo(key: string): ModuleInfo | null {
  return MODULES.find(m => m.key === key) ?? null;
}

export interface PracticeRow {
  module_key: string;
  enabled: boolean;
  pinned: boolean;
  settings: Record<string, unknown>;
  enabled_by: 'user' | 'cabinet';
}

// The practices "Your practices" shows: on, pinned, and known to this build,
// in registry order. Empty for everyone who has not said yes to one, and then
// the section renders nothing at all.
export function visiblePractices(rows: PracticeRow[] | null | undefined): PracticeRow[] {
  const list = (rows ?? []).filter(r => r && r.enabled && r.pinned && moduleInfo(r.module_key));
  return MODULES.map(m => list.find(r => r.module_key === m.key)).filter((r): r is PracticeRow => !!r);
}

// Monday-start week, local time, as YYYY-MM-DD strings.
export function weekDays(today: Date = new Date()): string[] {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`);
  }
  return out;
}
