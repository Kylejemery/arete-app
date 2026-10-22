// PHIL 801, Chrysippus' Syllogistic: Reconstruction, Evidence, Proof
// Doctoral research seminar, 14 sessions. Syllabus: docs/academy/PHIL_801_SYLLABUS.md.
//
// The course asks how we know what Stoic logic was: the sources are fragments,
// hostile reports and emended manuscripts, and every modern account is a
// reconstruction. Sessions pair the ancient texts (with the Greek) against the
// scholarly reconstructions (Bobzien 1996 is the spine; Frede, Mates, Kneale,
// Mueller, Mignucci, Williamson as opponents) and use the Themata project
// (themata/) as a laboratory for testing reconstructions against the evidence.
//
// Shape: Phil702Session plus the briefing fields the doctoral renderer shows
// (watchFor, yourTask). Rendering reuses Phil702SessionContent. Every quiz
// item is open-text and graded under the doctoral rubric in
// /api/academy/grade (courses with code 8xx): derivations step by step,
// source notes with loci, objection and reply against a named scholar.
//
// Sessions are authored in four files (1-4, 5-8, 9-11, 12-14) and joined here.

import type { Phil702Session } from '@/data/phil702';
import { SESSIONS as PART_A } from '@/data/phil801_sessions_1_4';
import { SESSIONS as PART_B } from '@/data/phil801_sessions_5_8';
import { SESSIONS as PART_C } from '@/data/phil801_sessions_9_11';
import { SESSIONS as PART_D } from '@/data/phil801_sessions_12_14';

export interface Phil801Session extends Phil702Session {
  id: number;                 // 1-14
  watchFor: string[];         // traps, disputed readings, what to notice in the Greek
  yourTask: string;           // what the student brings to the seminar
}

export const PHIL_801_SESSIONS: Phil801Session[] = [...PART_A, ...PART_B, ...PART_C, ...PART_D]
  .slice()
  .sort((a, b) => a.id - b.id);
