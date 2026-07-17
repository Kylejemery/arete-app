// The vocabulary drill deck — every vocab item from GREK 101 and LATN 101,
// with stable card ids ('g-<session>-<index>' / 'l-<session>-<index>') that
// key the per-user SRS state in vocab_progress.

import { GREK_101_SESSIONS } from './grek101';
import { LATN_101_SESSIONS } from './latn101';

export interface VocabCard {
  id: string;
  language: 'greek' | 'latin';
  front: string;   // the term
  hint: string;    // transliteration / pronunciation
  back: string;    // english
  session: number;
  courseCode: string;
}

export const VOCAB_DECK: VocabCard[] = [
  ...GREK_101_SESSIONS.flatMap(s =>
    (s.vocabulary ?? []).map((v, i) => ({
      id: `g-${s.id}-${i}`,
      language: 'greek' as const,
      front: v.greek,
      hint: v.transliteration,
      back: v.english,
      session: s.id,
      courseCode: 'GREK 101',
    }))
  ),
  ...LATN_101_SESSIONS.flatMap(s =>
    (s.vocabulary ?? []).map((v, i) => ({
      id: `l-${s.id}-${i}`,
      language: 'latin' as const,
      front: v.latin,
      hint: v.pronunciation,
      back: v.english,
      session: s.id,
      courseCode: 'LATN 101',
    }))
  ),
];

export const DECK_BY_ID = new Map(VOCAB_DECK.map(c => [c.id, c]));
