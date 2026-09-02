import type { Task } from '@/lib/types';

/**
 * A routine task. Identical to the stored `Task` plus the optional grey note
 * the mobile app attaches to the seeded "Train" discipline.
 */
export interface RoutineTask extends Task {
  note?: string;
}

export type RoutineVariant = 'morning' | 'evening';

export interface SeedTemplate {
  title: string;
  emoji: string;
}

export interface RoutineConfig {
  variant: RoutineVariant;
  /** Mono eyebrow above the headline — the web "chapter" convention. */
  eyebrow: string;
  /** Verbatim mobile screen title; `emphasis` is rendered as the gold <em>. */
  title: string;
  emphasis: string;
  /** Optional epigraph under the headline (evening only, kept from the web page). */
  epigraph?: { quote: string; attribution: string };
  headerBackground?: string;
  editModalTitle: string;
  /** Seeded on first run when the user has no templates of this type. */
  seedTemplates: SeedTemplate[];
  /**
   * localStorage flag that stops the seed from running twice. Morning has one
   * on mobile; evening deliberately does not, so clearing every evening
   * template re-seeds it (mobile behaviour, preserved here).
   */
  seedFlagKey?: string;
  allDone: { emoji: string; title: string; subtitle: string };
  cabinet: { label: string; href: (reply: string) => string };
}

export const ROUTINE_CONFIG: Record<RoutineVariant, RoutineConfig> = {
  morning: {
    variant: 'morning',
    eyebrow: 'Chapter I · Aurora',
    title: 'Morning',
    emphasis: 'Routine ☀️',
    editModalTitle: 'Edit Morning Routine',
    seedTemplates: [
      { title: 'Eat breakfast', emoji: '🍳' },
      { title: 'Train', emoji: '🥊' },
      { title: 'Meditate', emoji: '🌿' },
    ],
    seedFlagKey: 'morning_defaults_seeded',
    allDone: {
      emoji: '🏛️',
      title: 'Morning Complete',
      subtitle: 'The morning belongs to the disciplined.',
    },
    cabinet: {
      label: '🏛️ The Cabinet',
      href: (reply: string) => `/cabinet?morningMessage=${encodeURIComponent(reply)}`,
    },
  },
  evening: {
    variant: 'evening',
    eyebrow: 'Chapter II · Vesper',
    title: 'Evening',
    emphasis: 'Routine 🌙',
    epigraph: {
      quote: 'Let us prepare our minds as if we had come to the very end of life.',
      attribution: 'Seneca',
    },
    headerBackground: 'linear-gradient(180deg, #0a0a1e 0%, #07050f 100%)',
    editModalTitle: 'Edit Evening Routine',
    seedTemplates: [
      { title: 'Plan Tomorrow', emoji: '📜' },
      { title: 'Reflect on Your Day', emoji: '👁️' },
    ],
    allDone: {
      emoji: '🌿',
      title: 'Evening Complete',
      subtitle: 'Sleep sound. You have lived this day well.',
    },
    cabinet: {
      label: '🌙 The Cabinet',
      href: () => '/cabinet',
    },
  },
};

/** `emoji title` — the exact label the mobile app builds from a template. */
export function templateLabel(title: string, emoji: string | null | undefined): string {
  return emoji ? `${emoji} ${title}` : title;
}
