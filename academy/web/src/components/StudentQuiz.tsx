'use client';

// Session quiz — three question types, graded by the Proctor.
//
// Question types:
//   open  — free-text answer, graded by Claude against the reference answer
//           via POST /api/academy/grade (verdict: correct | partial | incorrect)
//   mc    — multiple choice (one answer), graded locally
//   msq   — select-all-that-apply, graded locally (exact match = correct;
//           a correct-only subset = partial credit)
//
// Reference answers are never shown before submission. On submit, everything
// is graded, the score is computed (correct 1.0 / partial 0.5 / incorrect 0),
// and >= PASS_THRESHOLD marks the session 'passed' — which unlocks the next
// session via the course page's completion gate. Below threshold marks
// 'failed' and the student may retake.

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// Open questions may omit `type` — all pre-existing course data is open-text.
export type QuizQuestion =
  | { type?: 'open'; question: string; answer: string }
  | { type: 'mc'; question: string; options: string[]; correct: number; explanation?: string }
  | { type: 'msq'; question: string; options: string[]; correct: number[]; explanation?: string };

type AnswerValue = string | number | number[] | null;

export type Verdict = 'correct' | 'partial' | 'incorrect';

interface GradeResult {
  index: number;
  verdict: Verdict;
  feedback: string;
}

interface Props {
  courseId: string;
  sessionId: number;
  questions: QuizQuestion[];
  onSubmitted?: () => void;
}

type SubmissionStatus = 'not_started' | 'completed' | 'passed' | 'failed';

const PASS_THRESHOLD = 70;

const VERDICT_SCORE: Record<Verdict, number> = { correct: 1, partial: 0.5, incorrect: 0 };

function isOpen(q: QuizQuestion): q is { type?: 'open'; question: string; answer: string } {
  return q.type === undefined || q.type === 'open';
}

function emptyAnswer(q: QuizQuestion): AnswerValue {
  if (isOpen(q)) return '';
  if (q.type === 'mc') return null;
  return [];
}

function answerIsValid(q: QuizQuestion, a: AnswerValue): boolean {
  if (isOpen(q)) return typeof a === 'string' && a.trim().length >= 10;
  if (q.type === 'mc') return typeof a === 'number';
  return Array.isArray(a) && a.length > 0;
}

// Deterministic grading for choice questions. MSQ: exact set = correct;
// a non-empty subset of the correct set = partial; any wrong pick = incorrect.
function gradeChoice(q: QuizQuestion, a: AnswerValue, index: number): GradeResult {
  if (q.type === 'mc') {
    const ok = a === q.correct;
    return {
      index,
      verdict: ok ? 'correct' : 'incorrect',
      feedback: q.explanation ?? '',
    };
  }
  // msq
  const sel = Array.isArray(a) ? [...a].sort() : [];
  const cor = [...(q as { correct: number[] }).correct].sort();
  const exact = sel.length === cor.length && sel.every((v, i) => v === cor[i]);
  const subset = sel.length > 0 && sel.every(v => cor.includes(v));
  return {
    index,
    verdict: exact ? 'correct' : subset ? 'partial' : 'incorrect',
    feedback: (q as { explanation?: string }).explanation ?? '',
  };
}

// ── Verdict badge ─────────────────────────────────────────────────────────────

const VERDICT_STYLE: Record<Verdict, { label: string; cls: string }> = {
  correct:   { label: 'Correct',        cls: 'border-green-500/50 bg-green-500/10 text-green-400' },
  partial:   { label: 'Partial Credit', cls: 'border-academy-gold/50 bg-academy-gold/10 text-academy-gold' },
  incorrect: { label: 'Incorrect',      cls: 'border-red-500/50 bg-red-500/10 text-red-400' },
};

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const v = VERDICT_STYLE[verdict];
  return (
    <span className={`inline-block text-[10px] font-mono font-semibold uppercase tracking-widest rounded-full border px-2 py-0.5 ${v.cls}`}>
      {v.label}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudentQuiz({ courseId, sessionId, questions, onSubmitted }: Props) {
  const storageKey = `quiz-v2-${courseId}-${sessionId}`;

  const [answers, setAnswers] = useState<AnswerValue[]>(() => questions.map(emptyAnswer));
  const [status, setStatus] = useState<SubmissionStatus | null>(null);
  const [grading, setGrading] = useState<GradeResult[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Restore localStorage draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === questions.length) {
          setAnswers(parsed as AnswerValue[]);
        }
      }
    } catch {}
  }, [storageKey, questions.length]);

  // Fetch existing Supabase progress
  useEffect(() => {
    let cancelled = false;
    async function fetchProgress() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoadingStatus(false); return; }

      const { data } = await supabase
        .from('session_progress')
        .select('status, submitted_answers, admin_notes, grading, score')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setStatus(data.status as SubmissionStatus);
        setAdminNotes(data.admin_notes ?? null);
        if (Array.isArray(data.grading)) setGrading(data.grading as GradeResult[]);
        if (typeof data.score === 'number') setScore(data.score);
        if (Array.isArray(data.submitted_answers) && data.submitted_answers.length === questions.length) {
          setAnswers(data.submitted_answers as AnswerValue[]);
        }
      } else {
        setStatus('not_started');
      }
      setLoadingStatus(false);
    }
    fetchProgress();
    return () => { cancelled = true; };
  }, [courseId, sessionId, questions.length]);

  const saveToLocalStorage = useCallback((next: AnswerValue[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  }, [storageKey]);

  const setAnswer = (i: number, value: AnswerValue) => {
    setAnswers(prev => {
      const next = [...prev];
      next[i] = value;
      saveToLocalStorage(next);
      return next;
    });
  };

  const toggleMsq = (i: number, option: number) => {
    setAnswers(prev => {
      const cur = Array.isArray(prev[i]) ? (prev[i] as number[]) : [];
      const next = [...prev];
      next[i] = cur.includes(option) ? cur.filter(o => o !== option) : [...cur, option];
      saveToLocalStorage(next);
      return next;
    });
  };

  const allValid = questions.every((q, i) => answerIsValid(q, answers[i]));
  const isGraded = status === 'passed' || status === 'failed';
  const isLegacySubmitted = status === 'completed'; // pre-grading submissions awaiting manual review

  const handleSubmit = async () => {
    if (!allValid || submitting) return;
    setSubmitting(true);
    setGradeError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Grade choice questions locally
      const results: GradeResult[] = [];
      const openItems: { index: number; question: string; referenceAnswer: string; studentAnswer: string }[] = [];
      questions.forEach((q, i) => {
        if (isOpen(q)) {
          openItems.push({
            index: i,
            question: q.question,
            referenceAnswer: q.answer,
            studentAnswer: String(answers[i] ?? ''),
          });
        } else {
          results.push(gradeChoice(q, answers[i], i));
        }
      });

      // 2. Send open-text answers to the Proctor for grading
      if (openItems.length > 0) {
        const res = await fetch('/api/academy/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId, sessionId, items: openItems }),
        });
        if (!res.ok) throw new Error(`Grading failed (${res.status})`);
        const data = await res.json();
        if (!Array.isArray(data.results) || data.results.length !== openItems.length) {
          throw new Error('Grading returned an unexpected result');
        }
        for (const r of data.results as GradeResult[]) {
          results.push({ index: r.index, verdict: r.verdict, feedback: r.feedback ?? '' });
        }
      }

      results.sort((a, b) => a.index - b.index);

      // 3. Score and persist
      const pct = Math.round(
        (results.reduce((n, r) => n + VERDICT_SCORE[r.verdict], 0) / questions.length) * 100
      );
      const newStatus: SubmissionStatus = pct >= PASS_THRESHOLD ? 'passed' : 'failed';

      const { error } = await supabase
        .from('session_progress')
        .upsert(
          {
            user_id: user.id,
            course_id: courseId,
            session_id: sessionId,
            status: newStatus,
            submitted_answers: answers,
            grading: results,
            score: pct,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,course_id,session_id' }
        );

      if (!error) {
        setGrading(results);
        setScore(pct);
        setStatus(newStatus);
        onSubmitted?.();
      } else {
        throw new Error(error.message);
      }
    } catch (e) {
      setGradeError(e instanceof Error ? e.message : 'Grading failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('session_progress')
      .upsert(
        {
          user_id: user.id,
          course_id: courseId,
          session_id: sessionId,
          status: 'not_started',
          submitted_answers: null,
          grading: null,
          score: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,course_id,session_id' }
      );
    try { localStorage.removeItem(storageKey); } catch {}
    setAnswers(questions.map(emptyAnswer));
    setGrading(null);
    setScore(null);
    setStatus('not_started');
    onSubmitted?.();
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loadingStatus) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-academy-muted italic text-sm">Loading quiz…</p>
      </div>
    );
  }

  const gradingByIndex = new Map((grading ?? []).map(g => [g.index, g]));

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
          Session Quiz
        </p>
        <h2 className="font-serif text-2xl text-academy-text">Session Examination</h2>
        {!isGraded && !isLegacySubmitted && (
          <p className="text-academy-muted text-sm mt-2 leading-relaxed">
            Answer every question, then submit. The Proctor grades your written answers against
            the course material; {PASS_THRESHOLD}% or better passes and unlocks the next session.
          </p>
        )}
      </div>

      {/* Result banner */}
      {isGraded && score !== null && (
        <div className={`mb-8 rounded-xl px-6 py-5 border ${
          status === 'passed'
            ? 'border-green-500/40 bg-green-500/10'
            : 'border-red-500/40 bg-red-500/10'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={`font-mono text-xs uppercase tracking-widest font-semibold mb-1 ${
                status === 'passed' ? 'text-green-400' : 'text-red-400'
              }`}>
                {status === 'passed' ? 'Passed' : 'Not Passed — Retake Required'}
              </p>
              <p className="text-academy-text text-sm leading-relaxed">
                Score: <span className="font-semibold">{score}%</span>
                {' '}({PASS_THRESHOLD}% required to pass{status === 'passed' ? ' — the next session is unlocked' : ''})
              </p>
            </div>
            {status === 'failed' && (
              <button
                onClick={handleRetake}
                className="flex-shrink-0 border border-academy-border text-academy-text rounded-lg px-4 py-2 text-sm hover:border-academy-gold transition-colors"
              >
                Retake Quiz
              </button>
            )}
          </div>
          {adminNotes && (
            <p className="text-academy-text text-sm leading-relaxed mt-3 whitespace-pre-line border-t border-academy-border/40 pt-3">
              {adminNotes}
            </p>
          )}
        </div>
      )}

      {/* Legacy submitted-awaiting-review banner */}
      {isLegacySubmitted && (
        <div className="mb-8 rounded-xl px-6 py-5 border border-academy-gold/30 bg-academy-gold/5">
          <p className="font-mono text-xs uppercase tracking-widest font-semibold mb-1 text-academy-gold">
            Submitted — Awaiting Review
          </p>
          {adminNotes && (
            <p className="text-academy-text text-sm leading-relaxed mt-1 whitespace-pre-line">{adminNotes}</p>
          )}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-8">
        {questions.map((q, i) => {
          const result = isGraded ? gradingByIndex.get(i) : undefined;
          return (
            <div key={i}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-academy-text text-sm font-medium leading-relaxed">
                  <span className="text-academy-gold font-mono mr-2">{i + 1}.</span>
                  {q.question}
                  {q.type === 'msq' && (
                    <span className="text-academy-muted text-xs italic ml-2">(select all that apply)</span>
                  )}
                </p>
                {result && <VerdictBadge verdict={result.verdict} />}
              </div>

              {/* ── Open text ── */}
              {isOpen(q) && (
                <>
                  <textarea
                    className="w-full bg-navy border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:border-academy-gold focus:outline-none text-sm resize-none leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
                    rows={4}
                    placeholder="Write your answer here…"
                    value={typeof answers[i] === 'string' ? (answers[i] as string) : ''}
                    disabled={isGraded || isLegacySubmitted}
                    onChange={e => setAnswer(i, e.target.value)}
                  />
                  {!isGraded && !isLegacySubmitted && typeof answers[i] === 'string' &&
                    (answers[i] as string).trim().length > 0 && (answers[i] as string).trim().length < 10 && (
                    <p className="text-academy-muted text-xs mt-1">
                      {10 - (answers[i] as string).trim().length} more characters required
                    </p>
                  )}
                </>
              )}

              {/* ── Multiple choice / select-all ── */}
              {!isOpen(q) && (
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => {
                    const chosen = q.type === 'mc'
                      ? answers[i] === oi
                      : Array.isArray(answers[i]) && (answers[i] as number[]).includes(oi);
                    const isCorrectOption = q.type === 'mc'
                      ? oi === q.correct
                      : (q.correct as number[]).includes(oi);
                    let cls = 'border-academy-border text-academy-muted';
                    if (isGraded && isCorrectOption) cls = 'border-green-500/60 bg-green-500/10 text-green-300';
                    else if (isGraded && chosen && !isCorrectOption) cls = 'border-red-500/50 bg-red-500/10 text-red-300';
                    else if (chosen) cls = 'border-academy-gold/50 text-academy-text';
                    return (
                      <label
                        key={oi}
                        className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-sm transition-colors ${cls} ${
                          isGraded || isLegacySubmitted ? 'cursor-default' : 'cursor-pointer'
                        }`}
                      >
                        <input
                          type={q.type === 'mc' ? 'radio' : 'checkbox'}
                          name={`q-${courseId}-${sessionId}-${i}`}
                          checked={chosen}
                          disabled={isGraded || isLegacySubmitted}
                          onChange={() => q.type === 'mc' ? setAnswer(i, oi) : toggleMsq(i, oi)}
                          className="mt-0.5 accent-academy-gold"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* ── Graded feedback ── */}
              {result && (
                <div className="mt-3 border-l-2 border-academy-gold/40 pl-4 space-y-2">
                  {result.feedback && (
                    <p className="text-academy-muted text-sm leading-relaxed">
                      <span className="text-academy-gold text-xs font-semibold uppercase tracking-widest mr-2">Proctor</span>
                      {result.feedback}
                    </p>
                  )}
                  {isOpen(q) && (
                    <p className="text-academy-muted text-sm leading-relaxed">
                      <span className="text-academy-gold text-xs font-semibold uppercase tracking-widest mr-2">Reference Answer</span>
                      {q.answer}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      {!isGraded && !isLegacySubmitted && (
        <div className="mt-10 border-t border-academy-gold/20 pt-6">
          <button
            onClick={handleSubmit}
            disabled={!allValid || submitting}
            className="bg-academy-gold text-navy font-semibold rounded-lg px-6 py-3 text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'The Proctor is grading…' : 'Submit for Grading'}
          </button>
          {gradeError && (
            <p className="text-red-400 text-xs mt-3">{gradeError}</p>
          )}
          <p className="text-academy-muted text-xs mt-3 leading-relaxed">
            Written answers are graded by the Proctor against the course material.
            You will receive your score, the correct answers, and feedback immediately.
          </p>
        </div>
      )}
    </div>
  );
}
