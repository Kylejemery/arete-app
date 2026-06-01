'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getEnrollment, getOrCreateSession, appendSeminarMessage } from '@/lib/db';
import { AGENT_MAP, SYSTEM_PROMPTS } from '@/lib/agents';
import { AgentSelector } from '@/components/seminar/AgentSelector';
import { ChatMessage, TypingIndicator } from '@/components/seminar/ChatMessage';
import PreSeminarBriefing from '@/components/PreSeminarBriefing';
import LessonParagraph from '@/components/LessonParagraph';
import { SEMINARS } from '@/data/seminars';
import { GREK_101_SESSIONS, type LanguageSession } from '@/data/grek101';
import { LATN_101_SESSIONS } from '@/data/latn101';
import { PHIL_705_SESSIONS, PHIL_705_BLOCKS, phil705ToLesson, type Phil705Session } from '@/data/phil705';
import { PHIL_701_SESSIONS, phil701ToLesson, type Phil701Session } from '@/data/phil701';
import StudentQuiz, { type QuizQuestion } from '@/components/StudentQuiz';
import { getProfile } from '@/lib/db';
import type { AgentId, Enrollment, SeminarSession, SeminarMessage, Tier } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// ── Course data ───────────────────────────────────────────────────────────────

interface SessionItem {
  id: number;
  title: string;
  locked: boolean;
  lockReason?: 'completion-gate' | null;
  videoUrl?: string;
}

const COURSE_SESSIONS: Record<string, SessionItem[]> = {
  'phil-701': [
    { id: 1,  title: 'What is Philosophy For? — Hadot as Entry',            locked: false },
    { id: 2,  title: 'The Good and the Preferred — Virtue and Indifferents', locked: true },
    { id: 3,  title: 'The Discipline of Desire — Wanting Rightly',           locked: true },
    { id: 4,  title: 'The Discipline of Action — Acting with Reservation',   locked: true },
    { id: 5,  title: 'The Discipline of Assent — The Inner Citadel',         locked: true },
    { id: 6,  title: 'Marcus Aurelius as Practitioner',                      locked: true },
    { id: 7,  title: 'Epictetus as Teacher',                                 locked: true },
    { id: 8,  title: 'Seneca as Writer',                                     locked: true },
    { id: 9,  title: 'Paper Workshop with the Writing Supervisor',           locked: true },
    { id: 10, title: 'Final Seminar — Synthesis and Objections',             locked: true },
    { id: 11, title: 'Qualifying Conversation with the Examiner',            locked: true },
  ],
  'phil-702': [
    { id: 1,  title: 'The Man and His Book — Introduction',                  locked: false },
    { id: 2,  title: 'Books I–II — Debts and the Practice of Memory',       locked: true },
    { id: 3,  title: 'Books III–IV — The Commanding Faculty',               locked: true },
    { id: 4,  title: 'Books V–VI — On Anger and Impermanence',              locked: true },
    { id: 5,  title: 'Books VII–VIII — Providence and Fate',                locked: true },
    { id: 6,  title: 'Books IX–X — Other People and the Social Animal',     locked: true },
    { id: 7,  title: 'Books XI–XII — Death, Time, and the View from Above', locked: true },
    { id: 8,  title: 'The Text as Spiritual Exercise',                       locked: true },
    { id: 9,  title: 'Paper Workshop with the Writing Supervisor',           locked: true },
    { id: 10, title: 'Final Seminar — Synthesis and Objections',             locked: true },
  ],
  'phil-703': [
    { id: 1,  title: 'The Former Slave and His School — Introduction',       locked: false },
    { id: 2,  title: 'The Three Disciplines — Desire, Action, Assent',      locked: true },
    { id: 3,  title: 'Book I — On Freedom',                                 locked: true },
    { id: 4,  title: 'Book II — On Steadfastness',                          locked: true },
    { id: 5,  title: 'Book III — On Social Duties',                         locked: true },
    { id: 6,  title: 'Book IV — On Progress',                               locked: true },
    { id: 7,  title: 'The Enchiridion as Distillation',                     locked: true },
    { id: 8,  title: 'Paper Workshop with the Writing Supervisor',           locked: true },
    { id: 9,  title: 'Final Seminar — Synthesis and Objections',            locked: true },
  ],
  'phil-704': [
    { id: 1,  title: 'How to Live with Time — Introduction',                locked: false },
    { id: 2,  title: 'Letters I–XX — On Friendship, Time, and the Self',    locked: true },
    { id: 3,  title: 'Letters XXI–XL — On Retirement and the Examined Life',locked: true },
    { id: 4,  title: 'Letters XLI–LX — On God and Nature',                 locked: true },
    { id: 5,  title: 'Letters LXI–LXXX — On Death and Dying Well',         locked: true },
    { id: 6,  title: 'On the Shortness of Life — Close Reading',            locked: true },
    { id: 7,  title: 'Seneca\'s Life as Counter-Evidence',                  locked: true },
    { id: 8,  title: 'Paper Workshop with the Writing Supervisor',           locked: true },
    { id: 9,  title: 'Final Seminar — Synthesis and Objections',            locked: true },
  ],
};

interface SessionContent {
  quote: string;
  quoteSource: string;
  intro: string[];
  readings: string[];
  prompt: string;
  practiceAssignment?: {
    coreIdea: string;
    assignment: string;
    duration: string;
    greekTerms?: string;
  };
}

interface CourseContent {
  code: string;
  shortTitle: string;
  fullTitle: string;
  assignedText: string;
  sessions: Record<number, SessionContent>;
}

const COURSE_CONTENT: Record<string, CourseContent> = {
  'phil-701': {
    code: 'PHIL 701',
    shortTitle: 'Foundations of\nStoic Ethics',
    fullTitle: 'Introduction to Stoic Philosophy',
    assignedText: 'Epictetus — Enchiridion',
    sessions: {
      1: {
        quote: '“Ancient philosophy proposed to mankind an art of living. By contrast, modern philosophy appears above all as the construction of a technical discourse.”',
        quoteSource: '— Pierre Hadot, Philosophy as a Way of Life',
        intro: [
          'This is the first seminar of your philosophical formation. Before you encounter any primary Stoic text — before Marcus, Epictetus, or Seneca — you will encounter a question: what is philosophy for? The question is not rhetorical. How you answer it will determine what kind of reader you become.',
          'Pierre Hadot argued that modern scholarship had fundamentally misread what the Greeks and Romans were doing. Philosophy, for the ancients, was a set of exercises aimed at transforming the self — what Hadot called spiritual exercises: attention, meditation, examination of conscience, the view from above, the preparation for death.',
          'PHIL 701 begins with Hadot because his framework is the interpretive lens for everything that follows. Stoic ethics is not a doctrine you learn in order to pass an examination; it is a set of disciplines you practice in order to become a certain kind of person.',
        ],
        readings: [],
        prompt: 'Hadot argues that ancient philosophy was not a body of doctrine to be learned but a set of exercises to be practiced. If he is right, what becomes of philosophy as we have inherited it in the modern university? And what would it mean to enter this program as a practitioner rather than a reader?',
        practiceAssignment: {
          coreIdea: 'Philosophy is not an academic discipline — it is a way of life. The question is not what Stoicism says but how you will live.',
          assignment: 'Before the next session: identify one thing you did today on autopilot — a reaction, a habit, a choice — that you never consciously examined. Write one sentence about it: what was the impression, what did you do, and what would you have done if you had stopped to think? This is your first act of philosophy.',
          duration: '5 min, once',
        },
      },
    },
  },
  'phil-702': {
    code: 'PHIL 702',
    shortTitle: 'The Meditations\nof Marcus Aurelius',
    fullTitle: 'The Meditations of Marcus Aurelius',
    assignedText: 'Marcus Aurelius — Meditations',
    sessions: {
      1: {
        quote: '“You have power over your mind — not outside events. Realize this, and you will find strength.”',
        quoteSource: '— Marcus Aurelius, Meditations IV.3',
        intro: [
          'The Meditations are not a treatise. They were never intended to be read. Marcus wrote to himself, in private, in a language that was not his native tongue, at the edge of the empire. They are a record of a man trying — and failing, and trying again — to live according to what he believed.',
          'This course reads the Meditations as a philosophical practice, not as a body of doctrine. The central question is not what Marcus believed but what he was doing when he wrote. Hadot’s answer: he was performing spiritual exercises. We will test that thesis book by book.',
          'You are not here to summarize. You are here to argue about what the text actually says, what it means, and whether the practice it embodies is coherent.',
        ],
        readings: [
          'Marcus Aurelius, Meditations, Books I–II (Gregory Hays translation)',
          'Hadot, The Inner Citadel, Introduction',
        ],
        prompt: 'Marcus writes to himself in the second person — “You have power over your mind.” Why? What does this grammatical choice tell us about the nature of the exercise he is performing? Is he persuading himself, commanding himself, or something else entirely?',
      },
    },
  },
  'phil-703': {
    code: 'PHIL 703',
    shortTitle: 'Epictetus and the\nDiscipline of Desire',
    fullTitle: 'Epictetus and the Discipline of Desire',
    assignedText: 'Epictetus — Discourses',
    sessions: {
      1: {
        quote: '“Make the best use of what is in your power, and take the rest as it happens.”',
        quoteSource: '— Epictetus, Discourses I.1',
        intro: [
          'Epictetus was a slave. This is not incidental biographical detail — it is the origin of his philosophy. His entire system is built around a single distinction: what is up to us and what is not. For a man who could not control his own body, this distinction was not abstract.',
          'The Discourses were not written by Epictetus but recorded by his student Arrian. We are reading notes from a classroom. The voice is direct, sometimes harsh, often comic. Epictetus had no patience for students who wanted to discuss philosophy rather than practice it.',
          'This course reads the Discourses as a curriculum. Each book develops a specific aspect of the three disciplines. Your task is not to agree with Epictetus but to understand exactly what he is claiming — and then to examine whether the claim holds.',
        ],
        readings: [
          'Epictetus, Discourses, Book I (Robin Hard translation)',
          'Epictetus, Enchiridion (full)',
        ],
        prompt: 'Epictetus claims that freedom is available to everyone, including slaves. This is either one of the most profound insights in the history of philosophy or a dangerous rationalization of injustice. Which is it? Defend your answer.',
      },
    },
  },
  'phil-704': {
    code: 'PHIL 704',
    shortTitle: "Seneca’s Letters and\nthe Art of Dying Well",
    fullTitle: "Seneca’s Letters and the Art of Dying Well",
    assignedText: 'Seneca — Letters to Lucilius',
    sessions: {
      1: {
        quote: '“Omnia, Lucili, aliena sunt, tempus tantum nostrum est.”\n“Everything, Lucilius, belongs to others; time alone is ours.”',
        quoteSource: '— Seneca, Epistulae I.1',
        intro: [
          'Seneca was a hypocrite. He wrote about poverty while living in extraordinary wealth. He wrote about the tranquility of retirement while serving at the court of Nero. He knew it. He said so. This course takes his hypocrisy seriously — not as an excuse to dismiss him, but as the central philosophical problem of his work.',
          'The Letters to Lucilius are the product of Seneca’s final years, written in the knowledge that Nero would eventually require his death. They are one of the great documents of a man trying to get his philosophy straight before it is too late.',
          'We read Seneca not to learn what to think about time, friendship, and death, but to watch a first-rate mind struggle with questions it cannot fully resolve. That is the nature of the exercise.',
        ],
        readings: [
          'Seneca, Letters to Lucilius, Letters I–X (Margaret Graver / A. A. Long translation)',
          'Seneca, On the Shortness of Life (full)',
        ],
        prompt: 'Seneca opens the Letters by telling Lucilius to “seize” time, to “gather and save” it. But he also says that the present moment is all we truly possess. Are these claims consistent? What is Seneca’s actual theory of time?',
      },
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROMANS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
function toRoman(n: number): string { return ROMANS[n - 1] ?? String(n); }

function LockIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-academy-muted/40 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function PreparedNotice({ sessionId, sessions }: { sessionId: number; sessions: SessionItem[] }) {
  const s = sessions.find(x => x.id === sessionId);
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-full border border-academy-border flex items-center justify-center mb-6">
        <svg className="w-6 h-6 text-academy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.247" />
        </svg>
      </div>
      <h2 className="font-serif text-2xl text-academy-text mb-2">{s?.title}</h2>
      <p className="text-academy-muted text-sm">
        The seminar text for this session is being prepared and will appear here once published.
      </p>
    </div>
  );
}

// ── Completion-gate lock notice ────────────────────────────────────────────────

function CompletionGateLock({ sessionId, sessions }: { sessionId: number; sessions: SessionItem[] }) {
  const s = sessions.find(x => x.id === sessionId);
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-8">
      <div className="w-14 h-14 rounded-full border border-academy-border flex items-center justify-center mb-6">
        <svg className="w-5 h-5 text-academy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="font-serif text-xl text-academy-text mb-3">{s?.title ?? `Session ${toRoman(sessionId)}`}</h2>
      <p className="text-academy-muted text-sm max-w-xs leading-relaxed">
        Pass the quiz for the previous session to unlock this one.
      </p>
    </div>
  );
}

// ── Quiz helpers ──────────────────────────────────────────────────────────────

function hasQuizData(courseId: string, sessionId: number): boolean {
  if (courseId === 'phil-701') {
    const s = PHIL_701_SESSIONS.find(x => x.id === sessionId);
    return (s?.quiz?.length ?? 0) > 0;
  }
  return false;
}

function getQuizQuestions(courseId: string, sessionId: number): QuizQuestion[] {
  if (courseId === 'phil-701') {
    return PHIL_701_SESSIONS.find(s => s.id === sessionId)?.quiz ?? [];
  }
  return [];
}

// ── SessionContent ────────────────────────────────────────────────────────────

function SessionContent({ content, sessionId, sessions }: { content: SessionContent; sessionId: number; sessions: SessionItem[] }) {
  const session = sessions.find(s => s.id === sessionId);
  return (
    <article>
      <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-2">Session {toRoman(sessionId)}</p>
      <h1 className="font-serif text-3xl text-academy-text mb-8 leading-tight">
        {session?.title ?? 'Introduction'}
      </h1>

      <blockquote className="border-l-4 border-academy-gold pl-6 py-1 mb-10">
        <p className="font-serif text-academy-text text-lg leading-relaxed italic whitespace-pre-line">
          {content.quote}
        </p>
        <footer className="mt-3 text-academy-muted text-sm not-italic">{content.quoteSource}</footer>
      </blockquote>

      <section className="mb-10">
        <h2 className="font-serif text-xl text-academy-text mb-5">Seminar Introduction</h2>
        <div className="space-y-4 text-academy-muted text-sm leading-relaxed">
          {content.intro.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </section>

      {content.readings.length > 0 && (
        <>
          <div className="border-t border-academy-gold/20 my-8" />

          <section className="mb-10">
            <h2 className="font-serif text-xl text-academy-text mb-4">Required Reading</h2>
            <ul className="space-y-3">
              {content.readings.map(r => (
                <li key={r} className="flex items-start gap-3 text-academy-muted text-sm">
                  <span className="text-academy-gold font-semibold leading-none mt-0.5">&rsaquo;</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="border-t border-academy-gold/20 my-8" />

      <section>
        <h2 className="font-serif text-xl text-academy-text mb-4">Discussion Prompt</h2>
        <div className="bg-academy-card border border-academy-gold/20 rounded-xl p-6">
          <p className="font-serif text-academy-text leading-relaxed italic">{content.prompt}</p>
          <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mt-5">
            Bring your response to the Socratic Proctor &rarr;
          </p>
        </div>
      </section>
      {content.practiceAssignment && (
        <PracticeAssignmentBlock pa={content.practiceAssignment} />
      )}
    </article>
  );
}

// ── Lecture Video Block ───────────────────────────────────────────────────────

function LectureVideoBlock({ sessionId, videoUrl }: { sessionId: number; videoUrl?: string }) {
  if (videoUrl) {
    return (
      <div
        className="w-full mb-8 rounded-xl overflow-hidden"
        style={{ aspectRatio: '16/9', border: '1px solid rgba(201,168,76,0.2)' }}
      >
        <iframe
          src={videoUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      className="w-full mb-8 rounded-xl flex flex-col items-center justify-center gap-3"
      style={{
        aspectRatio: '16/9',
        background: '#0C1420',
        border: '1px solid rgba(201,168,76,0.2)',
      }}
    >
      {/* Play button */}
      <div
        className="flex items-center justify-center w-14 h-14 rounded-full"
        style={{ border: '1.5px solid rgba(201,168,76,0.6)' }}
      >
        {/* Triangle */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M7 4.5L16 10L7 15.5V4.5Z" fill="rgba(201,168,76,0.8)" />
        </svg>
      </div>
      {/* Labels */}
      <div className="text-center">
        <p
          className="text-xs uppercase tracking-widest mb-1"
          style={{ fontFamily: 'DM Mono, monospace', color: '#6B7A99' }}
        >
          Lecture — Session {toRoman(sessionId)}
        </p>
        <p
          className="text-xs italic"
          style={{ fontFamily: 'DM Mono, monospace', color: '#6B7A99' }}
        >
          Video coming soon
        </p>
      </div>
    </div>
  );
}

// ── Resizable Drag Handle ─────────────────────────────────────────────────────

function DragHandle({ onDelta, onDragEnd }: { onDelta: (d: number) => void; onDragEnd: () => void }) {
  const startXRef = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    setActive(true);
    const onMove = (ev: MouseEvent) => {
      onDelta(ev.clientX - startXRef.current);
      startXRef.current = ev.clientX;
    };
    const onUp = () => {
      setActive(false);
      onDragEnd();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setActive(true);
    const onMove = (ev: TouchEvent) => {
      onDelta(ev.touches[0].clientX - startXRef.current);
      startXRef.current = ev.touches[0].clientX;
    };
    const onEnd = () => {
      setActive(false);
      onDragEnd();
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  };

  return (
    <div
      className="hidden lg:block flex-shrink-0 h-full"
      style={{
        width: 4,
        cursor: 'col-resize',
        background: (hovered || active) ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.15)',
        transition: 'background 0.15s',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    />
  );
}

// ── Language Course Registry ──────────────────────────────────────────────────

// The language layout never renders the `vocabulary` field, so the registry
// is typed without it — letting GREK ({greek,...}) and LATN ({latin,...})
// session arrays share one shape.
type LessonSession = Omit<LanguageSession, 'vocabulary'>;

interface LanguageCourseMeta {
  code: string;
  shortTitle: string; // \n-separated for two-line display
  sessions: LessonSession[];
  badge: { label: string; color: string };
}

const LANGUAGE_COURSES: Record<string, LanguageCourseMeta> = {
  'grek-101': {
    code: 'GREK 101',
    shortTitle: 'Ancient Greek\nfor Philosophers',
    sessions: GREK_101_SESSIONS,
    badge: { label: 'GK', color: '#1a5c38' },
  },
  'latn-101': {
    code: 'LATN 101',
    shortTitle: 'Latin\nfor Philosophers',
    sessions: LATN_101_SESSIONS,
    badge: { label: 'LA', color: '#4a2060' },
  },
};

// ── Language Course Components ────────────────────────────────────────────────

const GREEK_RE = /[Ͱ-Ͽἀ-῿]/;
const DM_MONO = 'DM Mono, monospace';

function GoldStar() {
  return (
    <svg className="w-3.5 h-3.5 text-academy-gold flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 1.5l2.6 5.27 5.82.846-4.21 4.105.994 5.796L10 14.85l-5.204 2.736.994-5.796L1.58 7.616l5.82-.846L10 1.5z" />
    </svg>
  );
}

function ParadigmTable({ paradigm, mono = false }: { paradigm: NonNullable<LanguageSession['parts'][number]['paradigms']>[number]; mono?: boolean }) {
  return (
    <div className="my-6">
      <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-2">{paradigm.title}</p>
      <div className="overflow-x-auto rounded-lg border border-academy-border">
        <table className="w-full text-sm border-collapse min-w-[480px]">
          <thead>
            <tr style={{ background: '#0C1420' }}>
              {paradigm.headers.map((h, i) => (
                <th key={i} className="text-left text-white font-semibold px-3 py-2 border-b border-academy-border whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paradigm.rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="px-3 py-2 border-b border-academy-border/40 text-academy-text align-top"
                    style={(mono || GREEK_RE.test(cell)) ? { fontFamily: DM_MONO } : undefined}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExerciseCard({ ex }: { ex: LanguageSession['exercises'][number] }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="bg-academy-card border border-academy-border rounded-xl p-5 mb-3">
      <div className="flex items-start gap-3">
        <span className="text-academy-gold text-xs font-mono font-semibold mt-0.5 flex-shrink-0">{ex.number}</span>
        <p className="text-academy-text text-sm leading-relaxed flex-1 whitespace-pre-line">{ex.prompt}</p>
      </div>
      {ex.answer && (
        <div className="mt-3 pl-8">
          <button
            onClick={() => setShown(s => !s)}
            className="text-academy-gold text-xs font-semibold uppercase tracking-widest hover:opacity-80 transition-opacity"
          >
            {shown ? '▲ Hide Answer' : '▼ Show Answer'}
          </button>
          {shown && (
            <p className="mt-2 text-academy-muted text-sm leading-relaxed border-l-2 border-academy-gold/40 pl-3 whitespace-pre-line">
              {ex.answer}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function QuizSection({ quiz }: { quiz: LanguageSession['quiz'] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = quiz.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);

  return (
    <section className="mt-10">
      <h2 className="font-serif text-xl text-academy-text mb-1">Session Quiz</h2>
      <p className="text-academy-muted text-xs mb-5">{quiz.length} questions · select one answer each</p>
      <div className="space-y-5">
        {quiz.map((q, qi) => (
          <div key={qi}>
            <p className="text-academy-text text-sm font-medium mb-2">
              <span className="text-academy-gold font-mono mr-2">{qi + 1}.</span>
              {q.question}
            </p>
            <div className="space-y-1.5 pl-6">
              {q.options.map((opt, oi) => {
                const chosen = answers[qi] === oi;
                const isCorrect = oi === q.correct;
                let cls = 'border-academy-border text-academy-muted';
                if (submitted && isCorrect) cls = 'border-green-500/60 bg-green-500/10 text-green-300';
                else if (submitted && chosen && !isCorrect) cls = 'border-red-500/50 bg-red-500/10 text-red-300';
                else if (chosen) cls = 'border-academy-gold/50 text-academy-text';
                return (
                  <label
                    key={oi}
                    className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${cls}`}
                  >
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      checked={chosen}
                      disabled={submitted}
                      onChange={() => setAnswers(a => ({ ...a, [qi]: oi }))}
                      className="mt-0.5 accent-academy-gold"
                    />
                    <span style={GREEK_RE.test(opt) ? { fontFamily: DM_MONO } : undefined}>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-4">
        {!submitted ? (
          <button
            onClick={() => setSubmitted(true)}
            disabled={Object.keys(answers).length < quiz.length}
            className="bg-academy-gold text-navy font-semibold rounded-lg px-5 py-2.5 text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Quiz
          </button>
        ) : (
          <>
            <p className="text-academy-text text-sm font-semibold">
              Score: <span className="text-academy-gold">{score} / {quiz.length}</span>
            </p>
            <button
              onClick={() => { setSubmitted(false); setAnswers({}); }}
              className="text-academy-muted text-xs underline hover:text-academy-text"
            >
              Retake
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function LanguageLessonContent({ session, mono = false }: { session: LessonSession; mono?: boolean }) {
  return (
    <article>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest">
          Session {session.id}
        </p>
        {session.isMilestone && (
          <span className="flex items-center gap-1 text-academy-gold text-xs font-semibold uppercase tracking-widest">
            <GoldStar /> Milestone
          </span>
        )}
      </div>
      <h1 className="font-serif text-3xl text-academy-text mb-1 leading-tight">{session.title}</h1>
      <p className="text-academy-muted text-sm italic mb-8">{session.subtitle}</p>

      {/* Learning objectives — teal callout box */}
      {session.objectives.length > 0 && (
        <div
          className="rounded-xl p-5 mb-10"
          style={{ background: 'rgba(45,156,142,0.08)', border: '1px solid rgba(45,156,142,0.3)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#2D9C8E' }}>
            Learning Objectives
          </p>
          <ol className="space-y-2">
            {session.objectives.map((o, i) => (
              <li key={i} className="flex items-start gap-3 text-academy-text text-sm leading-relaxed">
                <span className="font-mono text-xs mt-0.5 flex-shrink-0" style={{ color: '#2D9C8E' }}>
                  {i + 1}.
                </span>
                <span>{o}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Lesson parts */}
      {session.parts.map((part, pi) => (
        <section key={pi} className="mb-10">
          <h2 className="font-serif text-xl text-academy-text mb-3">{part.heading}</h2>
          <LessonParagraph text={part.body} className="text-academy-muted text-sm leading-relaxed whitespace-pre-line" />
          {part.paradigms?.map((p, idx) => <ParadigmTable key={idx} paradigm={p} mono={mono} />)}
          {part.callout && (
            <div
              className="rounded-xl p-5 mt-5"
              style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.25)' }}
            >
              {part.callout.label && (
                <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-2">
                  {part.callout.label}
                </p>
              )}
              <p
                className="text-academy-text text-sm leading-relaxed italic"
                style={GREEK_RE.test(part.callout.text) ? { fontFamily: DM_MONO } : undefined}
              >
                {part.callout.text}
              </p>
            </div>
          )}
        </section>
      ))}

      {/* Exercises */}
      <section className="mb-4">
        <h2 className="font-serif text-xl text-academy-text mb-1">Exercises</h2>
        <p className="text-academy-muted text-xs mb-5 italic">
          Attempt each before revealing the answer.
        </p>
        {session.exercises.map(ex => <ExerciseCard key={ex.number} ex={ex} />)}
      </section>

      {/* Quiz */}
      {session.quiz.length > 0 && <QuizSection quiz={session.quiz} />}
    </article>
  );
}

// ── Practice Assignment block ─────────────────────────────────────────────────

function PracticeAssignmentBlock({ pa }: {
  pa: { coreIdea: string; assignment: string; duration: string; greekTerms?: string };
}) {
  return (
    <div className="mt-8" style={{ borderLeft: '2px solid #C9A84C', paddingLeft: '1rem' }}>
      <p
        className="mb-2"
        style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.1em' }}
      >
        Practice assignment
      </p>
      <p className="text-academy-muted text-sm italic leading-relaxed">{pa.coreIdea}</p>
      <p className="text-academy-text leading-relaxed mt-2" style={{ fontSize: 15, lineHeight: 1.7 }}>
        {pa.assignment}
      </p>
      <div className="flex items-center gap-1.5 mt-3">
        <svg className="w-3 h-3 text-academy-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l2.5 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span
          className="text-academy-muted rounded-full px-2 py-0.5"
          style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, background: 'rgba(255,255,255,0.05)' }}
        >
          Time: {pa.duration}
        </span>
      </div>
      {pa.greekTerms && (
        <p className="text-academy-muted mt-2" style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>
          Key terms: {pa.greekTerms}
        </p>
      )}
    </div>
  );
}

// PHIL 701 sessions 2–11: the language renderer covers briefing-free lesson
// content (parts + exercises); the short-answer quiz is rendered below it as
// reveal cards for self-study. onQuizClick switches the tab to the submission
// interface when the student is ready to submit for grading.
function Phil701SessionContent({ session, onQuizClick }: { session: Phil701Session; onQuizClick?: () => void }) {
  return (
    <>
      <LanguageLessonContent session={phil701ToLesson(session)} />
      {session.isSeminar && session.practiceAssignment && (
        <PracticeAssignmentBlock pa={session.practiceAssignment} />
      )}
      {session.quiz.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-xl text-academy-text mb-1">Quiz &mdash; Ten Questions</h2>
          <p className="text-academy-muted text-xs mb-5 italic">
            Review each question, attempt your answer, then reveal.
          </p>
          {session.quiz.map((q, i) => (
            <ExerciseCard key={i} ex={{ number: '', prompt: q.question, answer: q.answer }} />
          ))}

          {onQuizClick && (
            <div className="mt-8 border-t border-academy-gold/20 pt-6">
              <p className="text-academy-muted text-sm mb-4 leading-relaxed">
                When you have worked through all ten questions, submit your written answers to the faculty for review.
              </p>
              <button
                onClick={onQuizClick}
                className="inline-flex items-center gap-2 bg-academy-gold text-navy font-semibold rounded-lg px-5 py-2.5 text-sm hover:opacity-90 transition-opacity"
              >
                Submit Quiz for Review &rarr;
              </button>
            </div>
          )}
        </section>
      )}
      {!session.isSeminar && session.practiceAssignment && (
        <PracticeAssignmentBlock pa={session.practiceAssignment} />
      )}
    </>
  );
}

interface DrillMsg { role: 'user' | 'assistant'; content: string }

function DrillChatPanel({ courseId, width }: { courseId: string; width: number }) {
  const [messages, setMessages] = useState<DrillMsg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const next: DrillMsg[] = [...messages, { role: 'user', content: input.trim() }];
    setMessages(next);
    setInput('');
    setIsLoading(true);
    try {
      let userId: string | undefined;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch {}
      const res = await fetch(`${API_BASE}/api/academy/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_type: 'language-drills',
          course_id: courseId,
          user_id: userId,
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const text =
        (typeof data.content === 'string' ? data.content : data.content?.[0]?.text) ??
        data.response ??
        'The drill room is temporarily unavailable.';
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'The drill room is temporarily unavailable. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="lg:flex-shrink-0 flex flex-col border-t lg:border-t-0 border-academy-border min-h-[560px] lg:min-h-0"
      style={{ width }}
    >
      <div className="flex-shrink-0 px-5 py-4 border-b border-academy-border bg-academy-card">
        <div className="flex items-center gap-2.5 mb-0.5">
          <span className="text-academy-gold font-serif text-base leading-none">Δ</span>
          <h3 className="font-serif text-academy-text text-base">The Drill Agent</h3>
        </div>
        <p className="text-academy-muted text-xs italic">Rigorous, patient. Attempt the exercise first.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6">
            <p className="text-4xl mb-4">⚱️</p>
            <p className="text-academy-muted text-xs leading-relaxed italic max-w-[220px]">
              Bring a paradigm to drill, an exercise to check, or a grammar question. I correct — I do not give answers before you attempt.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-academy-gold/15 text-academy-text border border-academy-gold/25'
                  : 'bg-academy-card text-academy-muted border border-academy-border'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-academy-card border border-academy-border rounded-xl px-4 py-2.5 text-academy-muted text-sm italic">
              The Drill Agent is considering…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex-shrink-0 border-t border-academy-border p-4 flex gap-2.5">
        <textarea
          className="flex-1 bg-navy border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:border-academy-gold focus:outline-none text-sm resize-none"
          rows={2}
          placeholder="Submit an attempt or ask a grammar question…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button
          onClick={send}
          disabled={isLoading || !input.trim()}
          className="self-end bg-academy-gold text-navy font-semibold rounded-lg px-4 py-2.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function LanguageCoursePage({ courseId }: { courseId: string }) {
  const router = useRouter();
  const meta = LANGUAGE_COURSES[courseId];
  // The parallel language track (the other unlocked language course).
  const parallelId = Object.keys(LANGUAGE_COURSES).find(id => id !== courseId);
  const parallel = parallelId ? LANGUAGE_COURSES[parallelId] : null;
  const [activeSessionId, setActiveSessionId] = useState(1);
  const [leftWidth, setLeftWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(380);
  const [initializing, setInitializing] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const widthsRef = useRef({ leftWidth, rightWidth });
  widthsRef.current = { leftWidth, rightWidth };

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const profile = await getProfile();
      setIsAdmin(profile?.is_admin === true);
      setInitializing(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('academy-panel-widths');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.leftWidth) setLeftWidth(Math.min(320, Math.max(160, parsed.leftWidth)));
        if (parsed.rightWidth) setRightWidth(Math.min(560, Math.max(300, parsed.rightWidth)));
      }
    } catch {}
  }, []);

  // Language sessions are open-access: every session is reachable without a
  // passing quiz score gating progression. Admins bypass unconditionally as a
  // safety net — and since no prerequisite lock remains, this applies to every
  // current and future session (including Sessions 11–20).
  const sessionItems = meta.sessions.map(s => ({
    id: s.id,
    title: s.title,
    locked: isAdmin ? false : false,
    isMilestone: !!s.isMilestone,
  }));
  const activeSession = meta.sessions.find(s => s.id === activeSessionId) ?? meta.sessions[0];

  if (initializing) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <p className="font-serif text-academy-muted italic text-sm">Preparing the lesson…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-navy" style={{ height: '100vh' }}>
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b border-academy-border bg-academy-card">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/courses" className="text-academy-muted hover:text-academy-gold text-sm transition-colors">
            ← Courses
          </Link>
          <span className="text-academy-border text-xs select-none">|</span>
          <span className="text-academy-gold font-serif text-sm hidden sm:inline">Arete Academy</span>
          {isAdmin && (
            <span className="text-[10px] font-bold tracking-widest uppercase text-academy-gold border border-academy-gold/50 rounded-full px-2 py-0.5 leading-none">
              Admin
            </span>
          )}
        </div>
        <Link href="/dashboard/papers" className="text-xs border border-academy-border text-academy-muted px-3 py-1.5 rounded hover:border-academy-gold hover:text-academy-text transition-all">
          ✎ Submit Paper
        </Link>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT: Session list */}
        <aside
          className="lg:flex-shrink-0 lg:overflow-y-auto border-b lg:border-b-0 border-academy-border bg-academy-card"
          style={{ width: leftWidth }}
        >
          <div className="p-5">
            <div className="hidden lg:block mb-5">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-bold tracking-wider text-white rounded px-1.5 py-0.5 leading-none"
                  style={{ background: meta.badge.color }}
                >
                  {meta.badge.label}
                </span>
                <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest">
                  {meta.code} · Language Track
                </p>
              </div>
              <h2 className="font-serif text-academy-text text-base leading-snug whitespace-pre-line">
                {meta.shortTitle}
              </h2>
            </div>
            <p className="lg:hidden text-academy-gold text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
              <span
                className="text-[10px] font-bold tracking-wider text-white rounded px-1.5 py-0.5 leading-none"
                style={{ background: meta.badge.color }}
              >
                {meta.badge.label}
              </span>
              {meta.code} — Sessions
            </p>
            <nav className="space-y-0.5">
              {sessionItems.map(s => (
                <button
                  key={s.id}
                  onClick={() => !s.locked && setActiveSessionId(s.id)}
                  disabled={s.locked}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-start gap-2.5 transition-all ${
                    s.id === activeSessionId
                      ? 'bg-academy-gold/10 text-academy-gold border border-academy-gold/20'
                      : s.locked
                      ? 'text-academy-muted/40 cursor-not-allowed'
                      : 'text-academy-muted hover:text-academy-text hover:bg-navy/50'
                  }`}
                >
                  <span className="flex-shrink-0 w-5 mt-0.5 flex items-center">
                    {s.isMilestone ? (
                      <GoldStar />
                    ) : (
                      <span className={`text-xs font-mono leading-none ${s.id === activeSessionId ? 'text-academy-gold' : 'text-academy-muted'}`}>
                        {s.id}
                      </span>
                    )}
                  </span>
                  <span className="leading-snug">{s.title}</span>
                </button>
              ))}
            </nav>
            {parallel && parallelId && (
              <div className="mt-5 pt-4 border-t border-academy-border">
                <Link
                  href={`/dashboard/courses/${parallelId}`}
                  className="text-academy-muted text-xs hover:text-academy-text transition-colors"
                >
                  Parallel track: {parallel.code} &rarr;
                </Link>
              </div>
            )}
          </div>
        </aside>

        <DragHandle
          onDelta={(d) => setLeftWidth(w => Math.min(320, Math.max(160, w + d)))}
          onDragEnd={() => localStorage.setItem('academy-panel-widths', JSON.stringify(widthsRef.current))}
        />

        {/* CENTER: Lesson */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10">
            <LanguageLessonContent session={activeSession} mono={courseId === 'latn-101'} />
          </div>
        </div>

        <DragHandle
          onDelta={(d) => setRightWidth(w => Math.min(560, Math.max(300, w - d)))}
          onDragEnd={() => localStorage.setItem('academy-panel-widths', JSON.stringify(widthsRef.current))}
        />

        {/* RIGHT: Drill agent */}
        <DrillChatPanel courseId={courseId} width={rightWidth} />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CoursePage() {
  const params = useParams();
  const courseId = params.courseId as string;
  if (courseId === 'phil-705') {
    return <Phil705CoursePage />;
  }
  if (LANGUAGE_COURSES[courseId]) {
    return <LanguageCoursePage courseId={courseId} />;
  }
  return <SeminarPage />;
}

function SeminarPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [session, setSession] = useState<SeminarSession | null>(null);
  const [messages, setMessages] = useState<SeminarMessage[]>([]);
  const [agentId, setAgentId] = useState<AgentId>('socratic-proctor');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [paperExpanded, setPaperExpanded] = useState(false);
  const [briefingComplete, setBriefingComplete] = useState(false);
  const [leftWidth, setLeftWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(380);
  const [sessionProgress, setSessionProgress] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<'lesson' | 'quiz'>('lesson');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Keep a ref to latest widths so onDragEnd closures always save the current value
  const widthsRef = useRef({ leftWidth, rightWidth });
  widthsRef.current = { leftWidth, rightWidth };

  // Completion-gate locking: session N unlocks when session N-1 is 'passed'.
  // Sessions without quiz data are treated as auto-passed for gating purposes
  // so that content-less sessions never become permanent blockers.
  // Admins and session 1 bypass unconditionally.
  const baseSessions = COURSE_SESSIONS[courseId] ?? COURSE_SESSIONS['phil-701'];
  const sessions: SessionItem[] = baseSessions.map(s => {
    if (isAdmin || s.id === 1) return { ...s, locked: false, lockReason: null };
    const prevHasQuiz = hasQuizData(courseId, s.id - 1);
    const prevEffectiveStatus = prevHasQuiz
      ? (sessionProgress[s.id - 1] ?? 'not_started')
      : 'passed';
    const locked = prevEffectiveStatus !== 'passed';
    return { ...s, locked, lockReason: locked ? ('completion-gate' as const) : null };
  });
  const courseContent = COURSE_CONTENT[courseId] ?? COURSE_CONTENT['phil-701'];
  const sessionContent = courseContent.sessions[activeSessionId];
  // PHIL 701 sessions 2–11 carry full transcribed content (briefing + parts +
  // exercises + quiz); session 1 stays the landing-card content above.
  const phil701Session = courseId === 'phil-701'
    ? PHIL_701_SESSIONS.find(s => s.id === activeSessionId)
    : undefined;
  const agent = AGENT_MAP[agentId];
  const tier = (enrollment?.tier ?? 'auditor') as Tier;
  const briefingData = SEMINARS[courseId]?.[activeSessionId - 1] ?? null;
  const briefingCompleteKey = `briefing-complete-${courseId}-${activeSessionId}`;

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const enroll = await getEnrollment();
      setEnrollment(enroll);
      const profile = await getProfile();
      setIsAdmin(profile?.is_admin === true);
      // Fetch quiz completion progress for this course
      const { data: progressRows } = await supabase
        .from('session_progress')
        .select('session_id, status')
        .eq('user_id', user.id)
        .eq('course_id', courseId);
      const progress: Record<number, string> = {};
      for (const row of progressRows ?? []) {
        progress[row.session_id as number] = row.status as string;
      }
      setSessionProgress(progress);
      const sess = await getOrCreateSession(courseId, agentId);
      if (sess) { setSession(sess); setMessages(sess.messages); }
      setInitializing(false);
    }
    init();
  }, [courseId, agentId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const stored = localStorage.getItem(briefingCompleteKey);
    setBriefingComplete(stored === 'true');
  }, [briefingCompleteKey]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('academy-panel-widths');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.leftWidth) setLeftWidth(Math.min(320, Math.max(160, parsed.leftWidth)));
        if (parsed.rightWidth) setRightWidth(Math.min(560, Math.max(300, parsed.rightWidth)));
      }
    } catch {}
  }, []);

  const handleAgentChange = async (newAgentId: AgentId) => {
    setAgentId(newAgentId);
    setMessages([]);
    setSession(null);
    setInitializing(true);
    const sess = await getOrCreateSession(courseId, newAgentId);
    if (sess) { setSession(sess); setMessages(sess.messages); }
    setInitializing(false);
  };

  // Re-fetches session_progress after a quiz is submitted so the sidebar
  // and locking logic immediately reflect the new 'completed' status.
  const refreshProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: progressRows } = await supabase
      .from('session_progress')
      .select('session_id, status')
      .eq('user_id', user.id)
      .eq('course_id', courseId);
    const progress: Record<number, string> = {};
    for (const row of progressRows ?? []) {
      progress[row.session_id as number] = row.status as string;
    }
    setSessionProgress(progress);
  };

  // Reset to Lesson tab whenever the student navigates to a different session.
  useEffect(() => { setActiveTab('lesson'); }, [activeSessionId]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !session) return;
    // Mark briefing complete on first message sent in this session
    if (!briefingComplete && messages.filter(m => m.role === 'user').length === 0) {
      localStorage.setItem(briefingCompleteKey, 'true');
      setBriefingComplete(true);
    }
    const userMsg: SeminarMessage = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    await appendSeminarMessage(session.id, userMsg).catch(console.error);
    try {
      const systemPrompt = SYSTEM_PROMPTS[agentId]
        .replace('{course_id}', courseId)
        .replace('{assigned_text}', courseContent.assignedText)
        .replace('{tier}', enrollment?.tier ?? 'auditor');
      const res = await fetch(`${API_BASE}/api/academy/seminar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, agentId, sessionId: session.id, systemPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const responseText = data.content?.[0]?.text ?? data.response ?? 'The seminar room is temporarily unavailable.';
      const assistantMsg: SeminarMessage = { role: 'assistant', content: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);
      await appendSeminarMessage(session.id, assistantMsg).catch(console.error);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'The seminar room is temporarily unavailable. Please try again.', timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <p className="font-serif text-academy-muted italic text-sm">Preparing the seminar room...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-navy" style={{ height: '100vh' }}>

      {/* ── HEADER ── */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b border-academy-border bg-academy-card">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/courses" className="text-academy-muted hover:text-academy-gold text-sm transition-colors">
            &larr; Courses
          </Link>
          <span className="text-academy-border text-xs select-none">|</span>
          <span className="text-academy-gold font-serif text-sm hidden sm:inline">Arete Academy</span>
          {isAdmin && (
            <span className="text-[10px] font-bold tracking-widest uppercase text-academy-gold border border-academy-gold/50 rounded-full px-2 py-0.5 leading-none">
              Admin
            </span>
          )}
        </div>
        <Link href="/dashboard/papers" className="text-xs border border-academy-border text-academy-muted px-3 py-1.5 rounded hover:border-academy-gold hover:text-academy-text transition-all">
          &#9998; Submit Paper
        </Link>
      </header>

      {/* ── THREE COLUMNS ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* LEFT: Course Navigation */}
        <aside
          className="lg:flex-shrink-0 lg:overflow-y-auto border-b lg:border-b-0 border-academy-border bg-academy-card"
          style={{ width: leftWidth }}
        >
          <div className="p-5">
            <div className="hidden lg:block mb-5">
              <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                {courseContent.code} &middot; Seminar
              </p>
              <h2 className="font-serif text-academy-text text-base leading-snug whitespace-pre-line">
                {courseContent.shortTitle}
              </h2>
            </div>
            <p className="lg:hidden text-academy-gold text-xs font-semibold uppercase tracking-widest mb-3">
              {courseContent.code} &mdash; Sessions
            </p>
            <nav className="space-y-0.5">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => !s.locked && setActiveSessionId(s.id)}
                  disabled={s.locked}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-start gap-2.5 transition-all ${
                    s.id === activeSessionId
                      ? 'bg-academy-gold/10 text-academy-gold border border-academy-gold/20'
                      : s.locked
                      ? 'text-academy-muted/40 cursor-not-allowed'
                      : 'text-academy-muted hover:text-academy-text hover:bg-navy/50'
                  }`}
                >
                  <span className="flex-shrink-0 w-5 mt-0.5">
                    {s.locked ? (
                      <LockIcon />
                    ) : (
                      <span className={`text-xs font-mono leading-none ${s.id === activeSessionId ? 'text-academy-gold' : 'text-academy-muted'}`}>
                        {toRoman(s.id)}
                      </span>
                    )}
                  </span>
                  <span className="leading-snug">{s.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <DragHandle
          onDelta={(d) => setLeftWidth(w => Math.min(320, Math.max(160, w + d)))}
          onDragEnd={() => localStorage.setItem('academy-panel-widths', JSON.stringify(widthsRef.current))}
        />

        {/* CENTER: Session Content */}
        {(() => {
          const currentSession = sessions.find(s => s.id === activeSessionId);
          const isLocked = currentSession?.locked ?? false;
          const quizQs = getQuizQuestions(courseId, activeSessionId);
          const showQuizTab = !isLocked && quizQs.length > 0;
          return (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab bar — Lesson / Quiz */}
              {showQuizTab && (
                <div className="flex-shrink-0 border-b border-academy-border bg-academy-card">
                  <div className="max-w-2xl mx-auto px-6 flex">
                    {(['lesson', 'quiz'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-widest border-b-2 transition-colors ${
                          activeTab === tab
                            ? 'border-academy-gold text-academy-gold'
                            : 'border-transparent text-academy-muted hover:text-academy-text'
                        }`}
                      >
                        {tab === 'lesson' ? 'Lesson' : 'Quiz'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-6 py-10">
                  {isLocked ? (
                    <CompletionGateLock sessionId={activeSessionId} sessions={sessions} />
                  ) : activeTab === 'quiz' && quizQs.length > 0 ? (
                    <StudentQuiz
                      courseId={courseId}
                      sessionId={activeSessionId}
                      questions={quizQs}
                      onSubmitted={refreshProgress}
                    />
                  ) : (
                    <>
                      <LectureVideoBlock
                        sessionId={activeSessionId}
                        videoUrl={currentSession?.videoUrl}
                      />
                      {phil701Session ? (
                        <>
                          <PreSeminarBriefing
                            key={`phil-701-${activeSessionId}`}
                            courseId="phil-701"
                            session={activeSessionId}
                            title={phil701Session.title}
                            problem={phil701Session.preSeminarBriefing.problem}
                            whyItMatters={phil701Session.preSeminarBriefing.whyItMatters}
                            watchFor={phil701Session.preSeminarBriefing.whatToWatchFor.split('\n\n').filter(Boolean)}
                            yourTask={phil701Session.preSeminarBriefing.yourTask}
                            requiredReading={phil701Session.preSeminarBriefing.requiredReading}
                          />
                          <Phil701SessionContent
                            session={phil701Session}
                            onQuizClick={quizQs.length > 0 ? () => setActiveTab('quiz') : undefined}
                          />
                        </>
                      ) : (
                        <>
                          {briefingData && (
                            <PreSeminarBriefing
                              key={`${courseId}-${activeSessionId}`}
                              courseId={courseId}
                              {...briefingData}
                              isComplete={briefingComplete}
                            />
                          )}
                          {sessionContent ? (
                            <SessionContent content={sessionContent} sessionId={activeSessionId} sessions={sessions} />
                          ) : (
                            <PreparedNotice sessionId={activeSessionId} sessions={sessions} />
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <DragHandle
          onDelta={(d) => setRightWidth(w => Math.min(560, Math.max(300, w - d)))}
          onDragEnd={() => localStorage.setItem('academy-panel-widths', JSON.stringify(widthsRef.current))}
        />

        {/* RIGHT: Proctor Chat */}
        <div
          className="lg:flex-shrink-0 flex flex-col border-t lg:border-t-0 border-academy-border min-h-[560px] lg:min-h-0"
          style={{ width: rightWidth }}
        >

          {/* Proctor header */}
          <div className="flex-shrink-0 px-5 py-4 border-b border-academy-border bg-academy-card">
            <div className="flex items-center gap-2.5 mb-0.5">
              <span className="text-academy-gold font-serif text-base leading-none">&Phi;</span>
              <h3 className="font-serif text-academy-text text-base">
                {agentId === 'socratic-proctor' ? 'The Socratic Proctor' : (agent?.name ?? 'The Proctor')}
              </h3>
            </div>
            <p className="text-academy-muted text-xs italic mb-3">
              {agentId === 'socratic-proctor' ? 'I do not lecture. I question.' : (agent?.role ?? '')}
            </p>
            <AgentSelector selectedId={agentId} tier={tier} onChange={handleAgentChange} />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6">
                <p className="text-4xl mb-4">&#127981;</p>
                <p className="text-academy-muted text-xs leading-relaxed italic max-w-[220px]">
                  The Proctor awaits. Bring your response to the discussion prompt, and the examination will commence.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} agentName={agent?.name ?? 'Proctor'} />
            ))}
            {isLoading && <TypingIndicator agentName={agent?.name ?? 'Proctor'} />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-academy-border p-4 flex gap-2.5">
            <textarea
              className="flex-1 bg-navy border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:border-academy-gold focus:outline-none text-sm resize-none"
              rows={2}
              placeholder="Respond to the Proctor..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !session}
              className="self-end bg-academy-gold text-navy font-semibold rounded-lg px-4 py-2.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              Submit
            </button>
          </div>

          {/* Paper Requirements */}
          <div className="flex-shrink-0 border-t border-academy-border">
            <button
              onClick={() => setPaperExpanded(x => !x)}
              className="w-full px-5 py-3 flex items-center justify-between text-academy-muted hover:text-academy-text transition-colors"
            >
              <span className="text-xs uppercase tracking-widest font-semibold">Paper Requirements</span>
              <span className="text-xs">{paperExpanded ? '▲' : '▼'}</span>
            </button>
            {paperExpanded && (
              <div className="px-5 pb-5 space-y-2">
                <p className="text-academy-text text-sm font-semibold">Seminar Paper &mdash; 5,000&ndash;7,000 words</p>
                <p className="text-academy-gold text-xs font-semibold">Due: End of Session {toRoman(sessions.length - 2)}</p>
                <p className="text-academy-muted text-xs leading-relaxed">
                  Your paper must make an original argument engaging at least two primary sources and two secondary sources. The Writing Supervisor will evaluate your draft before final submission.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PHIL 705 — Stoic Logic & Epistemology ─────────────────────────────────────
// Seminar course that reuses the language renderer (LanguageLessonContent) for
// multi-part session content, with the Socratic Proctor in the right column.

const PHIL_705_BLOCK_ORDER = ['Introduction', 'Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F', 'Block G', 'Block H'];

function Phil705SessionPill({ kind }: { kind: 'seminar' | 'exam' }) {
  return (
    <span className="text-[9px] font-bold tracking-widest uppercase text-academy-gold border border-academy-gold/50 rounded-full px-1.5 py-0.5 leading-none">
      {kind === 'seminar' ? 'Seminar' : 'Exam'}
    </span>
  );
}

function ProctorChatPanel({ session, width }: { session: Phil705Session; width: number }) {
  const [messages, setMessages] = useState<DrillMsg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const next: DrillMsg[] = [...messages, { role: 'user', content: input.trim() }];
    setMessages(next);
    setInput('');
    setIsLoading(true);
    try {
      let userId: string | undefined;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch {}
      const res = await fetch(`${API_BASE}/api/academy/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_type: 'socratic-proctor',
          course_id: 'phil-705',
          user_id: userId,
          course_context: session.primarySources || session.keyConcepts
            ? `Session ${session.id}: ${session.title}. Primary sources: ${session.primarySources}. Key concepts: ${session.keyConcepts}.`
            : undefined,
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const text =
        (typeof data.content === 'string' ? data.content : data.content?.[0]?.text) ??
        data.response ??
        'The seminar room is temporarily unavailable.';
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'The seminar room is temporarily unavailable. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="lg:flex-shrink-0 flex flex-col border-t lg:border-t-0 border-academy-border min-h-[560px] lg:min-h-0"
      style={{ width }}
    >
      <div className="flex-shrink-0 px-5 py-4 border-b border-academy-border bg-academy-card">
        <div className="flex items-center gap-2.5 mb-0.5">
          <span className="text-academy-gold font-serif text-base leading-none">&Phi;</span>
          <h3 className="font-serif text-academy-text text-base">The Socratic Proctor</h3>
        </div>
        <p className="text-academy-muted text-xs italic">I do not lecture. I question.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6">
            <p className="text-4xl mb-4">&#127981;</p>
            <p className="text-academy-muted text-xs leading-relaxed italic max-w-[220px]">
              The Proctor awaits. Bring your response to the session&rsquo;s task, and the examination will commence.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-academy-gold/15 text-academy-text border border-academy-gold/25'
                  : 'bg-academy-card text-academy-muted border border-academy-border'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-academy-card border border-academy-border rounded-xl px-4 py-2.5 text-academy-muted text-sm italic">
              The Proctor is considering&hellip;
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex-shrink-0 border-t border-academy-border p-4 flex gap-2.5">
        <textarea
          className="flex-1 bg-navy border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:border-academy-gold focus:outline-none text-sm resize-none"
          rows={2}
          placeholder="Respond to the Proctor..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button
          onClick={send}
          disabled={isLoading || !input.trim()}
          className="self-end bg-academy-gold text-navy font-semibold rounded-lg px-4 py-2.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          Submit
        </button>
      </div>
    </div>
  );
}

function Phil705StubContent({ session }: { session: Phil705Session }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-full border border-academy-border flex items-center justify-center mb-6">
        <svg className="w-6 h-6 text-academy-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.247m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.247" />
        </svg>
      </div>
      <h2 className="font-serif text-2xl text-academy-text mb-2">{session.title}</h2>
      <p className="text-academy-muted text-sm max-w-md">
        The source material for this session is being prepared and will be published here once available.
      </p>
    </div>
  );
}

function Phil705ExamContent({ session }: { session: Phil705Session }) {
  const sections = session.examFormat ?? [];
  return (
    <article>
      <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-2">
        Session {session.id}
      </p>
      <h1 className="font-serif text-3xl text-academy-text mb-1 leading-tight">{session.title}</h1>
      {session.primarySources && (
        <p className="text-academy-muted text-sm italic mb-8">{session.primarySources}</p>
      )}
      {sections.map((sec, i) => (
        <section key={i} className="mb-8">
          <h2 className="font-serif text-xl text-academy-text mb-3">{sec.title}</h2>
          <div className="space-y-3 text-academy-muted text-sm leading-relaxed">
            {sec.body.map((p, j) => <p key={j} className="whitespace-pre-line">{p}</p>)}
          </div>
        </section>
      ))}
    </article>
  );
}

function Phil705CoursePage() {
  const router = useRouter();
  const [activeSessionId, setActiveSessionId] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(380);
  const widthsRef = useRef({ leftWidth, rightWidth });
  widthsRef.current = { leftWidth, rightWidth };

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const profile = await getProfile();
      setIsAdmin(profile?.is_admin === true);
      setInitializing(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('academy-panel-widths');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.leftWidth) setLeftWidth(Math.min(340, Math.max(180, parsed.leftWidth)));
        if (parsed.rightWidth) setRightWidth(Math.min(560, Math.max(300, parsed.rightWidth)));
      }
    } catch {}
  }, []);

  const adminBypass = isAdmin;
  const activeSession = PHIL_705_SESSIONS.find(s => s.id === activeSessionId) ?? PHIL_705_SESSIONS[0];
  // Admin bypasses all locks. Non-admins reach this course only via the
  // dashboard, which gates it behind the prerequisite; here we keep a
  // conservative sequential lock (only Session 1 open) for safety.
  const isLocked = (s: Phil705Session) => (adminBypass ? false : s.id !== 1);

  if (initializing) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <p className="font-serif text-academy-muted italic text-sm">Preparing the seminar room&hellip;</p>
      </div>
    );
  }

  // Group sessions by block, preserving block order, for the sidebar.
  const grouped: { block: string; sessions: Phil705Session[] }[] = [];
  for (const blk of PHIL_705_BLOCK_ORDER) {
    const inBlock = PHIL_705_SESSIONS.filter(s => s.block === blk);
    if (inBlock.length > 0) grouped.push({ block: blk, sessions: inBlock });
  }

  return (
    <div className="flex flex-col bg-navy" style={{ height: '100vh' }}>
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b border-academy-border bg-academy-card">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/courses" className="text-academy-muted hover:text-academy-gold text-sm transition-colors">
            &larr; Courses
          </Link>
          <span className="text-academy-border text-xs select-none">|</span>
          <span className="text-academy-gold font-serif text-sm hidden sm:inline">Arete Academy</span>
          {isAdmin && (
            <span className="text-[10px] font-bold tracking-widest uppercase text-academy-gold border border-academy-gold/50 rounded-full px-2 py-0.5 leading-none">
              Admin
            </span>
          )}
        </div>
        <Link href="/dashboard/papers" className="text-xs border border-academy-border text-academy-muted px-3 py-1.5 rounded hover:border-academy-gold hover:text-academy-text transition-all">
          &#9998; Submit Paper
        </Link>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT: Block-grouped session list */}
        <aside
          className="lg:flex-shrink-0 lg:overflow-y-auto border-b lg:border-b-0 border-academy-border bg-academy-card"
          style={{ width: leftWidth }}
        >
          <div className="p-5">
            <div className="hidden lg:block mb-5">
              <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                PHIL 705 &middot; Logic Track
              </p>
              <h2 className="font-serif text-academy-text text-base leading-snug">
                Stoic Logic &amp;{'\n'}Epistemology
              </h2>
            </div>
            <p className="lg:hidden text-academy-gold text-xs font-semibold uppercase tracking-widest mb-3">
              PHIL 705 &mdash; Sessions
            </p>
            <nav className="space-y-3">
              {grouped.map(group => (
                <div key={group.block}>
                  <p
                    className="text-academy-muted uppercase mb-1.5 px-1"
                    style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '0.12em' }}
                  >
                    {PHIL_705_BLOCKS[group.block] ?? group.block}
                  </p>
                  <div className="space-y-0.5">
                    {group.sessions.map(s => {
                      const locked = isLocked(s);
                      return (
                        <button
                          key={s.id}
                          onClick={() => !locked && setActiveSessionId(s.id)}
                          disabled={locked}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-start gap-2.5 transition-all ${
                            s.id === activeSessionId
                              ? 'bg-academy-gold/10 text-academy-gold border border-academy-gold/20'
                              : locked
                              ? 'text-academy-muted/40 cursor-not-allowed'
                              : 'text-academy-muted hover:text-academy-text hover:bg-navy/50'
                          }`}
                        >
                          <span className="flex-shrink-0 w-5 mt-0.5 flex items-center">
                            {locked ? (
                              <LockIcon />
                            ) : (
                              <span className={`text-xs font-mono leading-none ${s.id === activeSessionId ? 'text-academy-gold' : 'text-academy-muted'}`}>
                                {s.id}
                              </span>
                            )}
                          </span>
                          <span className="leading-snug flex-1">
                            {s.title}
                            {(s.isSeminar || s.isFinalExam) && (
                              <span className="ml-2 inline-block align-middle">
                                <Phil705SessionPill kind={s.isFinalExam ? 'exam' : 'seminar'} />
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <DragHandle
          onDelta={(d) => setLeftWidth(w => Math.min(340, Math.max(180, w + d)))}
          onDragEnd={() => localStorage.setItem('academy-panel-widths', JSON.stringify(widthsRef.current))}
        />

        {/* CENTER: Briefing + session content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10">
            <LectureVideoBlock sessionId={activeSession.id} />
            {!activeSession.stub && !activeSession.isFinalExam && (
              <PreSeminarBriefing
                key={`phil-705-${activeSession.id}`}
                courseId="phil-705"
                session={activeSession.id}
                title={activeSession.title}
                problem={activeSession.preSeminarBriefing.problem}
                whyItMatters={activeSession.preSeminarBriefing.whyItMatters}
                watchFor={activeSession.preSeminarBriefing.whatToWatchFor ? [activeSession.preSeminarBriefing.whatToWatchFor] : []}
                yourTask={activeSession.preSeminarBriefing.yourTask}
              />
            )}
            {activeSession.stub ? (
              <Phil705StubContent session={activeSession} />
            ) : activeSession.isFinalExam ? (
              <Phil705ExamContent session={activeSession} />
            ) : (
              <LanguageLessonContent session={phil705ToLesson(activeSession)} />
            )}
          </div>
        </div>

        <DragHandle
          onDelta={(d) => setRightWidth(w => Math.min(560, Math.max(300, w - d)))}
          onDragEnd={() => localStorage.setItem('academy-panel-widths', JSON.stringify(widthsRef.current))}
        />

        {/* RIGHT: Socratic Proctor */}
        <ProctorChatPanel session={activeSession} width={rightWidth} />
      </div>
    </div>
  );
}
