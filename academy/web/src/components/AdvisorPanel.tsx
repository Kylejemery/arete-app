'use client';

// The Paidagōgos — the dashboard's academic advisor.
//
// In the ancient household the paidagōgos was the slave who walked the student
// to the door of the school — fitting company for a program built around
// Epictetus. On every visit it reads real session_progress rows from Supabase
// and tells the student where they stand, what to do next, and what readings
// that next step requires. Deep links use /dashboard/courses/<id>?session=N.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PHIL_CURRICULUM, type CurriculumCourse, type ReadingItem } from '@/data/curriculum';

const ROMANS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
const toRoman = (n: number) => ROMANS[n - 1] ?? String(n);

// One line of standing counsel, rotating daily.
const COUNSEL: Array<{ text: string; source: string }> = [
  { text: 'First say to yourself what you would be; and then do what you have to do.', source: 'Epictetus, Discourses III.23' },
  { text: 'No great thing is created suddenly, any more than a bunch of grapes or a fig.', source: 'Epictetus, Discourses I.15' },
  { text: 'How long are you going to wait before you demand the best for yourself?', source: 'Epictetus, Enchiridion §51' },
  { text: 'Waste no more time arguing about what a good man should be. Be one.', source: 'Marcus Aurelius, Meditations X.16' },
  { text: 'Confine yourself to the present.', source: 'Marcus Aurelius, Meditations VII.29' },
  { text: 'While we are postponing, life speeds by.', source: 'Seneca, Epistulae I.1' },
  { text: 'Every habit and faculty is preserved and increased by the corresponding actions.', source: 'Epictetus, Discourses II.18' },
  { text: 'The philosopher’s school is a surgery: you should not leave in pleasure, but in pain.', source: 'Epictetus, Discourses III.23' },
];

interface ProgressRow {
  course_id: string;
  session_id: number;
  status: string;
}

interface CourseStanding {
  course: CurriculumCourse;
  passed: number;        // gated sessions passed
  gated: number;         // gated (quiz-bearing) sessions total
  awaiting: number;      // submissions awaiting faculty review
  complete: boolean;
  // First session not yet passed — the working frontier of the course.
  frontier: { id: number; title: string; underReview: boolean } | null;
}

function computeStanding(course: CurriculumCourse, rows: ProgressRow[]): CourseStanding {
  const byId = new Map(rows.filter(r => r.course_id === course.id).map(r => [r.session_id, r.status]));
  const gatedSessions = course.sessions.filter(s => s.hasQuiz);
  const passed = gatedSessions.filter(s => byId.get(s.id) === 'passed').length;
  const awaiting = gatedSessions.filter(s => byId.get(s.id) === 'completed').length;

  // The frontier is the first gated session not yet passed. Sessions without a
  // quiz never block (mirrors the course page's completion-gate logic).
  const frontierSession = gatedSessions.find(s => byId.get(s.id) !== 'passed') ?? null;
  const complete = frontierSession === null;

  // Surface the un-gated session 1 (PHIL 701) as the frontier for a brand-new
  // course with no progress at all, so the advisor starts at the beginning.
  const anyProgress = rows.some(r => r.course_id === course.id);
  const frontier = complete
    ? null
    : !anyProgress
    ? { id: course.sessions[0].id, title: course.sessions[0].title, underReview: false }
    : {
        id: frontierSession!.id,
        title: frontierSession!.title,
        underReview: byId.get(frontierSession!.id) === 'completed',
      };

  return { course, passed, gated: gatedSessions.length, awaiting, complete, frontier };
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late hours';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function dayIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

function ReadingList({ items }: { items: ReadingItem[] }) {
  return (
    <ul className="space-y-2">
      {items.map((r, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm">
          <span className="text-academy-gold font-semibold leading-none mt-0.5">&rsaquo;</span>
          <span>
            <span className="text-academy-text">{r.source}</span>
            {r.passage && r.passage !== 'as assigned' && r.passage !== 'see text' && (
              <span className="text-academy-muted"> — {r.passage}</span>
            )}
            {r.note && !r.note.startsWith('Primary text') && (
              <span className="text-academy-muted italic text-xs block mt-0.5">{r.note}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function AdvisorPanel({ userName }: { userName: string }) {
  const [standings, setStandings] = useState<CourseStanding[] | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // No session (shouldn't happen behind the dashboard middleware) —
        // render the fresh-student view rather than loading forever.
        setStandings(PHIL_CURRICULUM.map(c => computeStanding(c, [])));
        return;
      }
      const { data } = await supabase
        .from('session_progress')
        .select('course_id, session_id, status')
        .eq('user_id', user.id);
      const rows = (data ?? []) as ProgressRow[];
      setStandings(PHIL_CURRICULUM.map(c => computeStanding(c, rows)));
    }
    load();
  }, []);

  const counsel = COUNSEL[dayIndex() % COUNSEL.length];

  if (!standings) {
    return (
      <div className="mb-8 bg-academy-card border border-academy-gold/30 rounded-xl p-6">
        <p className="text-academy-muted text-sm italic">The Paidagōgos is reviewing your file…</p>
      </div>
    );
  }

  const totalPassed = standings.reduce((n, s) => n + s.passed, 0);
  const totalGated = standings.reduce((n, s) => n + s.gated, 0);
  const totalAwaiting = standings.reduce((n, s) => n + s.awaiting, 0);
  const focus = standings.find(s => !s.complete) ?? null;
  const programComplete = focus === null;
  const readingsDue = focus?.frontier ? (focus.course.readings[focus.frontier.id] ?? []) : [];

  return (
    <div className="mb-8 bg-academy-card border border-academy-gold/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-academy-gold/15">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="text-academy-gold font-serif text-lg leading-none">&#928;</span>
          <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest">
            Your Advisor &middot; The Paidag&#333;gos
          </p>
        </div>
        <h2 className="font-serif text-2xl text-academy-text">
          {greeting()}, {userName}.
        </h2>
        <p className="text-academy-muted text-sm mt-1 leading-relaxed">
          {programComplete ? (
            <>Every session examination in the doctoral sequence is passed — {totalPassed} of {totalGated}, PHIL 701 through 704. The seminar year is yours: the language tracks, PHIL 705, and the library remain open.</>
          ) : (
            <>
              You have passed {totalPassed} of {totalGated} session examinations in the doctoral sequence.
              {totalAwaiting > 0 && (
                <> {totalAwaiting} submission{totalAwaiting > 1 ? 's are' : ' is'} with the faculty for review.</>
              )}
              {' '}Your working front is <span className="text-academy-text">{focus.course.code}</span>.
            </>
          )}
        </p>
      </div>

      {/* Direction */}
      {!programComplete && focus.frontier && (
        <div className="px-6 py-5 border-b border-academy-gold/15">
          <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-2">
            {focus.frontier.underReview ? 'While You Wait' : 'Your Next Task'}
          </p>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-serif text-lg text-academy-text leading-snug">
                Session {toRoman(focus.frontier.id)} — {focus.frontier.title}
              </p>
              <p className="text-academy-muted text-sm mt-1 leading-relaxed">
                {focus.frontier.underReview
                  ? 'Your quiz is awaiting faculty review. Revisit the session’s practice assignment — the assignments, not the quizzes, are the course.'
                  : 'Work the lesson, sit with the Proctor, then submit the quiz to unlock the next session.'}
              </p>
            </div>
            <Link
              href={`/dashboard/courses/${focus.course.id}?session=${focus.frontier.id}`}
              className="flex-shrink-0 bg-academy-gold text-academy-bg font-semibold px-5 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {focus.frontier.underReview ? 'Revisit Session' : 'Begin Session'} {toRoman(focus.frontier.id)} &rarr;
            </Link>
          </div>

          {readingsDue.length > 0 && (
            <div className="mt-4 bg-navy/40 border border-academy-border rounded-lg p-4">
              <p className="text-academy-muted text-xs font-semibold uppercase tracking-widest mb-3">
                Readings due for this session
              </p>
              <ReadingList items={readingsDue} />
            </div>
          )}
        </div>
      )}

      {/* Standing per course */}
      <div className="px-6 py-5 border-b border-academy-gold/15">
        <p className="text-academy-muted text-xs font-semibold uppercase tracking-widest mb-3">
          Your Standing
        </p>
        <div className="space-y-3">
          {standings.map(s => (
            <Link key={s.course.id} href={`/dashboard/courses/${s.course.id}`} className="block group">
              <div className="flex items-center justify-between text-sm mb-1">
                <p className="text-academy-text group-hover:text-academy-gold transition-colors">
                  <span className="font-semibold">{s.course.code}</span>
                  <span className="text-academy-muted"> · {s.course.title}</span>
                </p>
                <p className="text-academy-muted text-xs whitespace-nowrap ml-3">
                  {s.complete ? (
                    <span className="text-academy-gold font-semibold">Complete ✓</span>
                  ) : (
                    <>{s.passed} / {s.gated} passed{s.awaiting > 0 ? ` · ${s.awaiting} in review` : ''}</>
                  )}
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-navy overflow-hidden">
                <div
                  className="h-full rounded-full bg-academy-gold/80 transition-all"
                  style={{ width: `${s.gated === 0 ? 0 : Math.round((s.passed / s.gated) * 100)}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
        <p className="text-academy-muted text-xs mt-4 italic">
          Parallel tracks — <Link href="/dashboard/courses/grek-101" className="underline hover:text-academy-text">GREK 101</Link> and{' '}
          <Link href="/dashboard/courses/latn-101" className="underline hover:text-academy-text">LATN 101</Link> — stay open for daily drill;{' '}
          <Link href="/dashboard/courses/phil-705" className="underline hover:text-academy-text">PHIL 705</Link> (Stoic Logic) runs alongside Year 2.
        </p>
      </div>

      {/* Counsel of the day */}
      <div className="px-6 py-4 bg-navy/30">
        <p className="font-serif text-academy-text text-sm italic leading-relaxed">
          &ldquo;{counsel.text}&rdquo;
        </p>
        <p className="text-academy-muted text-xs mt-1">— {counsel.source}</p>
      </div>
    </div>
  );
}
