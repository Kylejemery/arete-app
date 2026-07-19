// PHIL 706 — Required Reading (data seed)
// From data/reference/PHIL_706_Course_Outline.md.
// Keyed by session number (1–7); session 7 is the capstone dialogue.

import type { ReadingItem } from '@/data/phil703_reading';

export const PHIL706_READING: Record<number, ReadingItem[]> = {
  1: [
    {
      source: 'Plato',
      passage: 'Protagoras 352a–358d (no one is overcome by pleasure against knowledge)',
      note: 'Primary text — required reading.',
    },
    {
      source: 'Plato',
      passage: 'Gorgias 466d–468e (tyrants do what seems best, not what they will)',
      note: 'Primary text — required reading.',
    },
    {
      source: 'Plato',
      passage: 'Meno 77b–78b (no one desires bad things)',
      note: 'Primary text — required reading.',
    },
  ],
  2: [
    {
      source: 'Epictetus',
      passage: 'Discourses 1.18 (that we should not be angry with those who err)',
      note: 'Primary text — required reading.',
    },
    {
      source: 'Epictetus',
      passage: 'Discourses 1.28 (that we should not be angry with humanity)',
      note: 'Primary text — required reading.',
    },
    {
      source: 'Epictetus',
      passage: "Discourses 2.26 (every error involves a contradiction the agent doesn't see)",
      note: 'Primary text — required reading.',
    },
    {
      source: 'Epictetus',
      passage: 'Enchiridion 42',
      note: 'Primary text — required reading.',
    },
  ],
  3: [
    {
      source: 'Seneca',
      passage: 'De Ira 1.1–1.4 (the portrait of anger)',
      note: 'Primary text — required reading.',
    },
    {
      source: 'Seneca',
      passage: 'De Ira 2.1–2.4 (the two-movements doctrine: first motion vs. assent)',
      note: 'Primary text — required reading.',
    },
    {
      source: 'Aulus Gellius',
      passage: 'Attic Nights 19.1 (the Stoic in the storm — pallor without passion)',
      note: 'Primary text — required reading.',
    },
  ],
  4: [
    {
      source: 'Seneca',
      passage: 'De Ira 1.5–1.21 (refutation of Aristotle; anger not useful in war, punishment, or greatness of soul)',
      note: 'Primary text — required reading.',
    },
    {
      source: 'Seneca',
      passage: "De Ira 3.5–3.6 (anger's costs to the angry)",
      note: 'Primary text — required reading.',
    },
    {
      source: 'Nussbaum, Anger and Forgiveness',
      passage: 'ch. 1–2',
      note: 'Modern foil (secondary) — contemporary restatement of the anti-anger case.',
    },
  ],
  5: [
    {
      source: 'Marcus Aurelius',
      passage: 'Meditations 2.1, 7.22, 7.26, 8.14, 11.18 (the daily rehearsal of the doctrine)',
      note: 'Primary text — required reading.',
    },
    {
      source: 'Epictetus',
      passage: 'Discourses 1.28 revisited (Medea as the limit case)',
      note: 'Primary text — required reading.',
    },
  ],
  6: [
    {
      source: 'Seneca',
      passage: 'De Ira 2.18–2.36, 3.10–3.13 (delay, self-examination, remedies)',
      note: 'Primary text — required reading.',
    },
    {
      source: 'Seneca',
      passage: 'De Ira 3.36 (the nightly review — "I sit in judgment on my day")',
      note: 'Primary text — required reading.',
    },
    {
      source: 'Marcus Aurelius',
      passage: 'Meditations 2.1 (the morning rehearsal)',
      note: 'Primary text — required reading.',
    },
  ],
  7: [
    {
      source: 'Your practicum log (weeks 2–6), your Session 4 ledger, and your Session 6 morning preparation',
      passage: 'see the capstone preparation',
      note: 'The capstone examines the log, not the memory.',
    },
  ],
};
