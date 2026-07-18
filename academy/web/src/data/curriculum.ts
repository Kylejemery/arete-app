// Curriculum manifest — the program map the dashboard advisor reads.
//
// Everything here is derived from the real course data files so it can never
// drift from what the course pages render. Only PHIL 701 Session 1 is stated
// by hand (its content lives in the course page's landing card, and its
// readings in seminars.ts, not in PHIL_701_SESSIONS).

import { PHIL_701_SESSIONS } from './phil701';
import { PHIL_702_SESSIONS } from './phil702';
import { PHIL_703_SESSIONS } from './phil703';
import { PHIL_704_SESSIONS } from './phil704';
import { GREK_101_SESSIONS } from './grek101';
import { LATN_101_SESSIONS } from './latn101';
import { GREK_201_SESSIONS } from './grek201';
import { LATN_201_SESSIONS } from './latn201';
import { PHIL_705_SESSIONS } from './phil705';
import { PHIL702_READING, type ReadingItem } from './phil702_reading';
import { PHIL703_READING } from './phil703_reading';
import { PHIL704_READING } from './phil704_reading';
import { SEMINARS } from './seminars';

export type { ReadingItem };

export interface CurriculumSession {
  id: number;
  title: string;
  hasQuiz: boolean; // quiz-bearing sessions gate progression (pass to unlock the next)
}

export interface CurriculumCourse {
  id: string;
  code: string;
  title: string;
  sessions: CurriculumSession[];
  readings: Record<number, ReadingItem[]>;
}

const phil701Readings: Record<number, ReadingItem[]> = {
  1: SEMINARS['phil-701']?.[0]?.requiredReading ?? [],
  ...Object.fromEntries(
    PHIL_701_SESSIONS.map(s => [s.id, s.preSeminarBriefing.requiredReading ?? []])
  ),
};

// The doctoral seminar sequence, in program order.
export const PHIL_CURRICULUM: CurriculumCourse[] = [
  {
    id: 'phil-701',
    code: 'PHIL 701',
    title: 'The Art of Living — Foundations',
    sessions: [
      { id: 1, title: 'What is Philosophy For? — Hadot as Entry', hasQuiz: false },
      ...PHIL_701_SESSIONS.map(s => ({
        id: s.id,
        title: s.title,
        hasQuiz: (s.quiz?.length ?? 0) > 0,
      })),
    ],
    readings: phil701Readings,
  },
  {
    id: 'phil-702',
    code: 'PHIL 702',
    title: 'Living the Practice — Marcus Aurelius',
    sessions: PHIL_702_SESSIONS.map(s => ({
      id: s.id,
      title: s.title,
      hasQuiz: (s.quiz?.length ?? 0) > 0,
    })),
    readings: PHIL702_READING,
  },
  {
    id: 'phil-703',
    code: 'PHIL 703',
    title: 'The School of Epictetus',
    sessions: PHIL_703_SESSIONS.map(s => ({
      id: s.id,
      title: s.title,
      hasQuiz: (s.quiz?.length ?? 0) > 0,
    })),
    readings: PHIL703_READING,
  },
  {
    id: 'phil-704',
    code: 'PHIL 704',
    title: 'The Examined Correspondence — Seneca',
    sessions: PHIL_704_SESSIONS.map(s => ({
      id: s.id,
      title: s.title,
      hasQuiz: (s.quiz?.length ?? 0) > 0,
    })),
    readings: PHIL704_READING,
  },
];

// The parallel tracks — open-access (no completion gating), but quiz results
// are recorded to session_progress by the language QuizSection, so the
// advisor can show standing. `hasQuiz` marks recordable sessions.
export const PARALLEL_CURRICULUM: CurriculumCourse[] = [
  {
    id: 'grek-101',
    code: 'GREK 101',
    title: 'Ancient Greek for Philosophers',
    sessions: GREK_101_SESSIONS.map(s => ({
      id: s.id,
      title: s.title,
      hasQuiz: (s.quiz?.length ?? 0) > 0,
    })),
    readings: {},
  },
  {
    id: 'latn-101',
    code: 'LATN 101',
    title: 'Latin for Philosophers',
    sessions: LATN_101_SESSIONS.map(s => ({
      id: s.id,
      title: s.title,
      hasQuiz: (s.quiz?.length ?? 0) > 0,
    })),
    readings: {},
  },
  {
    id: 'phil-705',
    code: 'PHIL 705',
    title: 'The Logic of Clear Seeing',
    sessions: PHIL_705_SESSIONS.map(s => ({
      id: s.id,
      title: s.title,
      hasQuiz: (s.quiz?.length ?? 0) > 0,
    })),
    readings: {},
  },
  {
    id: 'grek-201',
    code: 'GREK 201',
    title: 'Reading the Stoics in Greek',
    sessions: GREK_201_SESSIONS.map(s => ({
      id: s.id,
      title: s.title,
      hasQuiz: (s.quiz?.length ?? 0) > 0,
    })),
    readings: {},
  },
  {
    id: 'latn-201',
    code: 'LATN 201',
    title: 'Reading Seneca',
    sessions: LATN_201_SESSIONS.map(s => ({
      id: s.id,
      title: s.title,
      hasQuiz: (s.quiz?.length ?? 0) > 0,
    })),
    readings: {},
  },
];
