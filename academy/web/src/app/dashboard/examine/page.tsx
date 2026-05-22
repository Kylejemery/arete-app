'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PHIL701_EXAM_QUESTIONS, type SessionExamData } from '@/data/examQuestions';

const COURSE_ID = 'phil-701';

type Period = 'morning' | 'evening';

interface StoredResponse {
  id: string;
  prompt: string;
  response: string;
}

interface DailyExamRow {
  user_id: string;
  date: string;
  course_id: string;
  session_id: number;
  morning_responses: StoredResponse[] | null;
  morning_completed_at: string | null;
  proctor_morning_response: string | null;
  evening_responses: StoredResponse[] | null;
  evening_completed_at: string | null;
  proctor_evening_response: string | null;
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function periodResponses(row: DailyExamRow | null, p: Period): StoredResponse[] {
  if (!row) return [];
  const v = p === 'morning' ? row.morning_responses : row.evening_responses;
  return Array.isArray(v) ? v : [];
}

function periodCompletedAt(row: DailyExamRow | null, p: Period): string | null {
  if (!row) return null;
  return p === 'morning' ? row.morning_completed_at : row.evening_completed_at;
}

function periodProctor(row: DailyExamRow | null, p: Period): string | null {
  if (!row) return null;
  return p === 'morning' ? row.proctor_morning_response : row.proctor_evening_response;
}

// ── A completed period, shown read-only ──────────────────────────────────────

function PeriodReview({
  label,
  responses,
  proctorQuestion,
}: {
  label: string;
  responses: StoredResponse[];
  proctorQuestion: string | null;
}) {
  return (
    <div className="mb-12">
      <p className="font-mono text-academy-gold text-xs uppercase tracking-widest mb-6">
        {label}
      </p>
      <div className="space-y-6">
        {responses.map((r, i) => (
          <div key={r.id}>
            <p className="text-academy-text text-sm font-medium leading-relaxed mb-2">
              <span className="font-mono text-academy-gold mr-2">{i + 1}.</span>
              {r.prompt}
            </p>
            <p className="text-academy-muted text-sm leading-relaxed whitespace-pre-wrap pl-6">
              {r.response}
            </p>
          </div>
        ))}
      </div>

      {proctorQuestion && (
        <div className="border-l-2 border-academy-gold pl-5 mt-8">
          <p className="font-mono text-academy-gold text-xs uppercase tracking-widest mb-2">
            The Proctor Asks:
          </p>
          <p className="font-serif text-academy-text text-lg leading-relaxed italic">
            {proctorQuestion}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ExaminePage() {
  const router = useRouter();

  const [period] = useState<Period>(() =>
    new Date().getHours() < 12 ? 'morning' : 'evening'
  );
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(1);
  const [today, setToday] = useState(() => localToday());
  const [row, setRow] = useState<DailyExamRow | null>(null);

  const [drafts, setDrafts] = useState<string[]>(['', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const examData: SessionExamData =
    PHIL701_EXAM_QUESTIONS[sessionId] ?? PHIL701_EXAM_QUESTIONS[1];
  const draftKey = `examine-${COURSE_ID}-${sessionId}-${today}-${period}`;

  // ── Mount: auth + session position + today's record ────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      // Session position: highest passed PHIL 701 session, default 1.
      const { data: progress } = await supabase
        .from('session_progress')
        .select('session_id')
        .eq('user_id', user.id)
        .eq('course_id', COURSE_ID)
        .eq('status', 'passed')
        .order('session_id', { ascending: false })
        .limit(1)
        .maybeSingle();

      const td = localToday();
      const { data: examRow } = await supabase
        .from('daily_examinations')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', td)
        .maybeSingle();

      if (cancelled) return;
      setUserId(user.id);
      setSessionId(progress?.session_id ?? 1);
      setToday(td);
      setRow((examRow as DailyExamRow | null) ?? null);
      setLoaded(true);
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  // ── Restore a localStorage draft for the current, unsubmitted period ────────
  const currentDone = !!periodCompletedAt(row, period);
  useEffect(() => {
    if (!loaded || currentDone) return;
    try {
      const stored = localStorage.getItem(draftKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 3) {
          setDrafts(parsed.map(v => (typeof v === 'string' ? v : '')));
        }
      }
    } catch {}
  }, [loaded, currentDone, draftKey]);

  const handleChange = (i: number, value: string) => {
    setDrafts(prev => {
      const next = [...prev];
      next[i] = value;
      try { localStorage.setItem(draftKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const allValid = drafts.every(d => d.trim().length >= 20);

  const handleSubmit = async () => {
    if (!allValid || submitting || !userId) return;
    setSubmitting(true);
    setError(null);
    try {
      const questions = examData[period];
      const responsesPayload: StoredResponse[] = questions.map((q, i) => ({
        id: q.id,
        prompt: q.prompt,
        response: drafts[i].trim(),
      }));
      const completedAt = new Date().toISOString();

      // 1. Persist the submission (one row per user per day).
      const upsertRow: Record<string, unknown> = {
        user_id: userId,
        date: today,
        course_id: COURSE_ID,
        session_id: sessionId,
      };
      if (period === 'morning') {
        upsertRow.morning_responses = responsesPayload;
        upsertRow.morning_completed_at = completedAt;
      } else {
        upsertRow.evening_responses = responsesPayload;
        upsertRow.evening_completed_at = completedAt;
      }
      const { error: upErr } = await supabase
        .from('daily_examinations')
        .upsert(upsertRow, { onConflict: 'user_id,date' });
      if (upErr) {
        setError('Your examination could not be saved. Please try again.');
        return;
      }

      // 2. Ask the Proctor for a single follow-up question.
      let proctorQuestion = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (accessToken) {
          const res = await fetch('/api/examine/proctor', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              responses: responsesPayload.map(r => ({ prompt: r.prompt, response: r.response })),
              sessionId,
              period,
            }),
          });
          if (res.ok) {
            const data: unknown = await res.json();
            const q = (data as { question?: unknown }).question;
            if (typeof q === 'string') proctorQuestion = q.trim();
          }
        }
      } catch (err) {
        console.error('[examine] proctor request failed:', err);
      }

      // 3. Persist the Proctor question (best-effort).
      if (proctorQuestion) {
        const proctorUpdate: Record<string, unknown> =
          period === 'morning'
            ? { proctor_morning_response: proctorQuestion }
            : { proctor_evening_response: proctorQuestion };
        await supabase
          .from('daily_examinations')
          .update(proctorUpdate)
          .eq('user_id', userId)
          .eq('date', today);
      }

      // 4. Clear the draft and reflect the new state.
      try { localStorage.removeItem(draftKey); } catch {}
      setRow(prev => {
        const base: DailyExamRow = prev ?? {
          user_id: userId,
          date: today,
          course_id: COURSE_ID,
          session_id: sessionId,
          morning_responses: null,
          morning_completed_at: null,
          proctor_morning_response: null,
          evening_responses: null,
          evening_completed_at: null,
          proctor_evening_response: null,
        };
        if (period === 'morning') {
          return {
            ...base,
            morning_responses: responsesPayload,
            morning_completed_at: completedAt,
            proctor_morning_response: proctorQuestion || null,
          };
        }
        return {
          ...base,
          evening_responses: responsesPayload,
          evening_completed_at: completedAt,
          proctor_evening_response: proctorQuestion || null,
        };
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-academy-muted italic text-sm">Preparing the examination…</p>
      </div>
    );
  }

  const morningDone = !!periodCompletedAt(row, 'morning');
  const eveningDone = !!periodCompletedAt(row, 'evening');
  const bothDone = morningDone && eveningDone;

  const prettyDate = new Date(`${today}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Passages ──────────────────────────────────────────────────────── */}
      <section className="border-l-2 border-academy-gold pl-5 mb-14">
        <p className="font-mono text-academy-gold text-xs uppercase tracking-widest mb-6">
          Passages for Session {sessionId} — Read Daily
        </p>
        <div className="space-y-6">
          {examData.passages.map((p, i) => (
            <div key={i}>
              <p className="font-serif text-academy-text text-lg leading-relaxed">
                {p.text}
              </p>
              <p className="font-mono text-academy-muted text-xs mt-2">
                — {p.attribution}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Completion banner ─────────────────────────────────────────────── */}
      {bothDone && (
        <div className="border border-academy-border bg-academy-card rounded-lg p-6 mb-12 text-center">
          <p className="font-serif text-academy-text text-lg">
            Both examinations complete for today.
          </p>
          <p className="text-academy-muted text-sm mt-1">Return tomorrow.</p>
        </div>
      )}

      {/* ── Morning ───────────────────────────────────────────────────────── */}
      {morningDone ? (
        <PeriodReview
          label="Morning Examination"
          responses={periodResponses(row, 'morning')}
          proctorQuestion={periodProctor(row, 'morning')}
        />
      ) : period === 'morning' ? (
        <ExamForm
          period="morning"
          prettyDate={prettyDate}
          questions={examData.morning}
          drafts={drafts}
          allValid={allValid}
          submitting={submitting}
          error={error}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      ) : null}

      {/* ── Evening ───────────────────────────────────────────────────────── */}
      {eveningDone ? (
        <PeriodReview
          label="Evening Examination"
          responses={periodResponses(row, 'evening')}
          proctorQuestion={periodProctor(row, 'evening')}
        />
      ) : period === 'evening' ? (
        <ExamForm
          period="evening"
          prettyDate={prettyDate}
          questions={examData.evening}
          drafts={drafts}
          allValid={allValid}
          submitting={submitting}
          error={error}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}

// ── The active period's question form ────────────────────────────────────────

function ExamForm({
  period,
  prettyDate,
  questions,
  drafts,
  allValid,
  submitting,
  error,
  onChange,
  onSubmit,
}: {
  period: Period;
  prettyDate: string;
  questions: { id: string; prompt: string }[];
  drafts: string[];
  allValid: boolean;
  submitting: boolean;
  error: string | null;
  onChange: (i: number, value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      {/* Period indicator */}
      <div className="mb-8">
        <p className="font-mono text-academy-gold text-sm uppercase tracking-[0.2em]">
          {period === 'morning' ? 'Morning Examination' : 'Evening Examination'}
        </p>
        <p className="text-academy-muted text-sm mt-1">{prettyDate}</p>
      </div>

      {/* Questions */}
      <div className="space-y-8">
        {questions.map((q, i) => {
          const val = drafts[i] ?? '';
          const len = val.trim().length;
          const remaining = 20 - len;
          return (
            <div key={q.id}>
              <p className="text-academy-text text-sm font-medium leading-relaxed mb-3">
                <span className="font-mono text-academy-gold mr-2">{i + 1}.</span>
                {q.prompt}
              </p>
              <textarea
                className="w-full min-h-20 bg-navy border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:border-academy-gold focus:outline-none text-sm resize-y leading-relaxed"
                placeholder="Write your response here…"
                value={val}
                onChange={e => onChange(i, e.target.value)}
              />
              {len > 0 && remaining > 0 && (
                <p className="text-academy-muted text-xs mt-1">
                  {remaining} more character{remaining !== 1 ? 's' : ''} required
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="mt-10 border-t border-academy-gold/20 pt-6">
        <button
          onClick={onSubmit}
          disabled={!allValid || submitting}
          className="bg-academy-gold text-academy-bg font-semibold rounded-lg px-6 py-3 text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting…' : 'Submit Examination'}
        </button>
        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
        <p className="text-academy-muted text-xs mt-3 leading-relaxed">
          Each response requires at least 20 characters. After you submit, the
          Proctor will ask one follow-up question.
        </p>
      </div>
    </div>
  );
}
