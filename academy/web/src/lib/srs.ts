// SM-2-lite spaced repetition scheduling for the vocabulary drill.
//
// Grades: again (forgot — relearn in ~10 min), hard, good, easy.
// Intervals are in days; 'again' resets the rep count and schedules the card
// back into today's session. Ease is bounded at 1.3 like classic SM-2.

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface SrsState {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
}

export const NEW_CARD_STATE: SrsState = { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 };

export interface SrsResult extends SrsState {
  dueAt: Date;
}

export function review(state: SrsState, grade: Grade, now: Date = new Date()): SrsResult {
  let { ease, intervalDays, reps, lapses } = state;

  if (grade === 'again') {
    ease = Math.max(1.3, ease - 0.2);
    lapses += 1;
    reps = 0;
    intervalDays = 0;
    return { ease, intervalDays, reps, lapses, dueAt: new Date(now.getTime() + 10 * 60 * 1000) };
  }

  if (grade === 'hard') {
    ease = Math.max(1.3, ease - 0.15);
    intervalDays = reps === 0 ? 1 : Math.max(1, intervalDays * 1.2);
  } else if (grade === 'good') {
    intervalDays = reps === 0 ? 1 : Math.max(1, intervalDays * ease);
  } else {
    // easy
    ease = ease + 0.15;
    intervalDays = reps === 0 ? 3 : Math.max(2, intervalDays * ease * 1.3);
  }

  reps += 1;
  intervalDays = Math.round(intervalDays * 10) / 10;
  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return { ease: Math.round(ease * 100) / 100, intervalDays, reps, lapses, dueAt };
}

// Human label for the interval a grade would produce — shown on the buttons.
export function previewInterval(state: SrsState, grade: Grade): string {
  if (grade === 'again') return '10 min';
  const r = review(state, grade);
  if (r.intervalDays < 1.5) return '1 day';
  if (r.intervalDays < 30) return `${Math.round(r.intervalDays)} days`;
  return `${Math.round(r.intervalDays / 30)} mo`;
}
