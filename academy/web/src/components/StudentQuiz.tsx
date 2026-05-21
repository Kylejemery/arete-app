'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface QuizQuestion {
  question: string;
  answer: string; // reference answer — not shown to the student
}

interface Props {
  courseId: string;
  sessionId: number;
  questions: QuizQuestion[];
  onSubmitted?: () => void;
}

type SubmissionStatus = 'not_started' | 'completed' | 'passed' | 'failed';

export default function StudentQuiz({ courseId, sessionId, questions, onSubmitted }: Props) {
  const storageKey = `quiz-${courseId}-${sessionId}`;

  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));
  const [status, setStatus] = useState<SubmissionStatus | null>(null);
  const [adminNotes, setAdminNotes] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Restore localStorage draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === questions.length) {
          setAnswers(parsed as string[]);
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
        .select('status, submitted_answers, admin_notes')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('session_id', sessionId)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setStatus(data.status as SubmissionStatus);
        setAdminNotes(data.admin_notes ?? null);
        if (Array.isArray(data.submitted_answers) && data.submitted_answers.length === questions.length) {
          setAnswers(data.submitted_answers as string[]);
        }
      } else {
        setStatus('not_started');
      }
      setLoadingStatus(false);
    }
    fetchProgress();
    return () => { cancelled = true; };
  }, [courseId, sessionId, questions.length]);

  const saveToLocalStorage = useCallback((next: string[]) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  }, [storageKey]);

  const handleChange = (i: number, value: string) => {
    setAnswers(prev => {
      const next = [...prev];
      next[i] = value;
      saveToLocalStorage(next);
      return next;
    });
  };

  const allValid = answers.every(a => a.trim().length >= 10);
  const isSubmitted = status === 'completed' || status === 'passed' || status === 'failed';

  const handleSubmit = async () => {
    if (!allValid || submitting) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('session_progress')
        .upsert(
          {
            user_id: user.id,
            course_id: courseId,
            session_id: sessionId,
            status: 'completed',
            submitted_answers: answers,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,course_id,session_id' }
        );

      if (!error) {
        setStatus('completed');
        onSubmitted?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (loadingStatus) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-academy-muted italic text-sm">Loading quiz…</p>
      </div>
    );
  }

  // ── Status banner ─────────────────────────────────────────────────────────────

  const bannerConfig = {
    passed:    { label: 'Passed',                     colors: 'border-green-500/40 bg-green-500/10', text: 'text-green-400' },
    failed:    { label: 'Needs Revision',             colors: 'border-red-500/40 bg-red-500/10',   text: 'text-red-400'   },
    completed: { label: 'Submitted — Awaiting Review', colors: 'border-academy-gold/30 bg-academy-gold/5', text: 'text-academy-gold' },
  };
  const banner = status && status !== 'not_started' ? bannerConfig[status] : null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
          Session Quiz
        </p>
        <h2 className="font-serif text-2xl text-academy-text">Short-Answer Questions</h2>
        <p className="text-academy-muted text-sm mt-2 leading-relaxed">
          Answer each question in your own words. Minimum 10 characters per answer.
          Your responses are submitted for faculty review.
        </p>
      </div>

      {/* Status banner */}
      {banner && (
        <div className={`mb-8 rounded-xl px-6 py-5 border ${banner.colors}`}>
          <p className={`font-mono text-xs uppercase tracking-widest font-semibold mb-1 ${banner.text}`}>
            {banner.label}
          </p>
          {adminNotes && (
            <p className="text-academy-text text-sm leading-relaxed mt-1 whitespace-pre-line">
              {adminNotes}
            </p>
          )}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-8">
        {questions.map((q, i) => {
          const val = answers[i] ?? '';
          const tooShort = val.trim().length > 0 && val.trim().length < 10;
          return (
            <div key={i}>
              <p className="text-academy-text text-sm font-medium leading-relaxed mb-3">
                <span className="text-academy-gold font-mono mr-2">{i + 1}.</span>
                {q.question}
              </p>
              <textarea
                className="w-full bg-navy border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:border-academy-gold focus:outline-none text-sm resize-none leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
                rows={4}
                placeholder="Write your answer here…"
                value={val}
                disabled={isSubmitted}
                onChange={e => handleChange(i, e.target.value)}
              />
              {!isSubmitted && tooShort && (
                <p className="text-academy-muted text-xs mt-1">
                  {10 - val.trim().length} more character{10 - val.trim().length !== 1 ? 's' : ''} required
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      {!isSubmitted && (
        <div className="mt-10 border-t border-academy-gold/20 pt-6">
          <button
            onClick={handleSubmit}
            disabled={!allValid || submitting}
            className="bg-academy-gold text-navy font-semibold rounded-lg px-6 py-3 text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit Quiz for Review'}
          </button>
          <p className="text-academy-muted text-xs mt-3 leading-relaxed">
            Once submitted you cannot edit your responses. The faculty will review and mark Pass or Needs Revision.
          </p>
        </div>
      )}
    </div>
  );
}
