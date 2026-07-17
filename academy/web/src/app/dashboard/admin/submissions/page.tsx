'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getProfile } from '@/lib/db';
import { PHIL_701_SESSIONS } from '@/data/phil701';
import { PHIL_702_SESSIONS } from '@/data/phil702';
import { PHIL_703_SESSIONS } from '@/data/phil703';
import { PHIL_704_SESSIONS } from '@/data/phil704';
import type { QuizQuestion } from '@/components/StudentQuiz';

// ── Types ─────────────────────────────────────────────────────────────────────

type SubmittedAnswer = string | number | number[] | null;

interface ProgressRow {
  id: string;
  user_id: string;
  course_id: string;
  session_id: number;
  status: 'completed' | 'passed' | 'failed';
  submitted_answers: SubmittedAnswer[] | null;
  submitted_at: string | null;
  graded_at: string | null;
  graded_by: string | null;
  admin_notes: string | null;
  score: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getReferenceAnswers(courseId: string, sessionId: number): QuizQuestion[] {
  switch (courseId) {
    case 'phil-701': return PHIL_701_SESSIONS.find(s => s.id === sessionId)?.quiz ?? [];
    case 'phil-702': return PHIL_702_SESSIONS.find(s => s.id === sessionId)?.quiz ?? [];
    case 'phil-703': return PHIL_703_SESSIONS.find(s => s.id === sessionId)?.quiz ?? [];
    case 'phil-704': return PHIL_704_SESSIONS.find(s => s.id === sessionId)?.quiz ?? [];
    default: return [];
  }
}

// Render a submitted answer as text, resolving choice indices to option text.
function renderAnswer(ref: QuizQuestion | undefined, answer: SubmittedAnswer): string {
  if (answer == null || answer === '') return '';
  if (ref && ref.type === 'mc' && typeof answer === 'number') {
    return ref.options[answer] ?? String(answer);
  }
  if (ref && ref.type === 'msq' && Array.isArray(answer)) {
    return answer.map(i => ref.options[i] ?? String(i)).join(' · ');
  }
  return typeof answer === 'string' ? answer : JSON.stringify(answer);
}

// The correct/reference answer for any question type.
function referenceText(ref: QuizQuestion | undefined): string {
  if (!ref) return '';
  if (ref.type === 'mc') {
    return `${ref.options[ref.correct]}${ref.explanation ? ` — ${ref.explanation}` : ''}`;
  }
  if (ref.type === 'msq') {
    return `${ref.correct.map(i => ref.options[i]).join(' · ')}${ref.explanation ? ` — ${ref.explanation}` : ''}`;
  }
  return ref.answer;
}

const STATUS_COLOR: Record<string, string> = {
  completed: 'text-academy-gold',
  passed:    'text-green-400',
  failed:    'text-red-400',
};

const STATUS_LABEL: Record<string, string> = {
  completed: 'Awaiting Review',
  passed:    'Passed',
  failed:    'Needs Revision',
};

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminSubmissionsPage() {
  const router = useRouter();

  const [loading, setLoading]       = useState(true);
  const [rows, setRows]             = useState<ProgressRow[]>([]);
  const [selected, setSelected]     = useState<ProgressRow | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [grading, setGrading]       = useState(false);

  // Auth + initial fetch
  useEffect(() => {
    async function init() {
      const profile = await getProfile();
      if (!profile?.is_admin) {
        router.replace('/dashboard');
        return;
      }
      const { data, error } = await supabase
        .from('session_progress')
        .select('*')
        .neq('status', 'not_started')
        .order('submitted_at', { ascending: false });
      if (!error) setRows((data ?? []) as ProgressRow[]);
      setLoading(false);
    }
    init();
  }, [router]);

  // Select a row to review
  const handleSelect = (row: ProgressRow) => {
    setSelected(row);
    setAdminNotes(row.admin_notes ?? '');
  };

  // Submit a Pass or Needs-Revision verdict
  const handleGrade = async (verdict: 'passed' | 'failed') => {
    if (!selected || grading) return;
    setGrading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const notes = adminNotes.trim() || null;
      const { error } = await supabase
        .from('session_progress')
        .update({
          status:      verdict,
          admin_notes: notes,
          graded_at:   new Date().toISOString(),
          graded_by:   user?.id ?? null,
          updated_at:  new Date().toISOString(),
        })
        .eq('id', selected.id);
      if (!error) {
        const updated: ProgressRow = {
          ...selected,
          status:      verdict,
          admin_notes: notes,
          graded_at:   new Date().toISOString(),
        };
        setSelected(updated);
        setRows(prev => prev.map(r => (r.id === selected.id ? updated : r)));
      }
    } finally {
      setGrading(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <p className="font-serif text-academy-muted italic text-sm">Loading submissions…</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const refs = selected ? getReferenceAnswers(selected.course_id, selected.session_id) : [];

  return (
    <div className="flex flex-col bg-navy" style={{ height: '100vh' }}>

      {/* Header */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-6 border-b border-academy-border bg-academy-card">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-academy-muted hover:text-academy-gold text-sm transition-colors"
          >
            ← Dashboard
          </Link>
          <span className="text-academy-border text-xs select-none">|</span>
          <span className="text-academy-muted text-xs">Quiz Submissions</span>
        </div>
        <span className="text-[10px] font-bold tracking-widest uppercase text-academy-gold border border-academy-gold/50 rounded-full px-2 py-0.5 leading-none">
          Admin
        </span>
      </header>

      {/* Two-panel body */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Submission list */}
        <aside className="w-72 flex-shrink-0 border-r border-academy-border bg-academy-card overflow-y-auto">
          <div className="px-4 py-3 border-b border-academy-border">
            <p className="font-mono text-academy-muted text-xs uppercase tracking-widest">
              {rows.length} submission{rows.length !== 1 ? 's' : ''}
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-academy-muted text-sm italic">No submissions yet.</p>
            </div>
          ) : (
            <nav className="p-2 space-y-0.5">
              {rows.map(row => (
                <button
                  key={row.id}
                  onClick={() => handleSelect(row)}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors border ${
                    selected?.id === row.id
                      ? 'bg-academy-gold/10 border-academy-gold/20'
                      : 'border-transparent hover:bg-navy/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-academy-text text-xs font-semibold">
                      {row.course_id.toUpperCase()} · S{row.session_id}
                    </span>
                    <span className={`font-mono text-[10px] uppercase font-semibold ${STATUS_COLOR[row.status] ?? 'text-academy-muted'}`}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </div>
                  <p className="text-academy-muted text-[11px] font-mono">
                    {row.user_id.slice(0, 8)}…
                  </p>
                  <p className="text-academy-muted/60 text-[10px] mt-0.5">
                    {fmt(row.submitted_at)}
                  </p>
                </button>
              ))}
            </nav>
          )}
        </aside>

        {/* RIGHT: Detail panel */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-center px-8">
              <p className="text-academy-muted text-sm italic">Select a submission to review.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-8 py-10">

              {/* Submission meta */}
              <div className="mb-8">
                <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
                  {selected.course_id.toUpperCase()} · Session {selected.session_id}
                </p>
                <h1 className="font-serif text-2xl text-academy-text mb-3">Quiz Review</h1>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-academy-muted font-mono">
                  <span>Student: {selected.user_id.slice(0, 12)}…</span>
                  <span>Submitted: {fmt(selected.submitted_at)}</span>
                  <span className={STATUS_COLOR[selected.status]}>
                    {STATUS_LABEL[selected.status] ?? selected.status}
                  </span>
                </div>
              </div>

              {/* Q&A comparison */}
              <div className="space-y-10 mb-12">
                {(selected.submitted_answers ?? []).map((answer, i) => {
                  const ref = refs[i];
                  const studentText = renderAnswer(ref, answer);
                  const refText = referenceText(ref);
                  return (
                    <div key={i} className="border-l-2 border-academy-gold/30 pl-5">
                      <p className="text-academy-text text-sm font-medium leading-relaxed mb-4">
                        <span className="text-academy-gold font-mono mr-2">{i + 1}.</span>
                        {ref?.question ?? `Question ${i + 1}`}
                        {ref && ref.type === 'mc' && <span className="text-academy-muted text-xs ml-2">(multiple choice)</span>}
                        {ref && ref.type === 'msq' && <span className="text-academy-muted text-xs ml-2">(select all)</span>}
                      </p>

                      {/* Student answer */}
                      <div className="mb-4">
                        <p className="font-mono text-academy-muted text-[10px] uppercase tracking-widest mb-2">
                          Student Answer
                        </p>
                        <p className="text-academy-text text-sm leading-relaxed bg-navy border border-academy-border rounded-lg px-4 py-3 whitespace-pre-line">
                          {studentText || <span className="italic text-academy-muted">No answer provided</span>}
                        </p>
                      </div>

                      {/* Reference answer */}
                      {refText && (
                        <div>
                          <p className="font-mono text-academy-muted text-[10px] uppercase tracking-widest mb-2">
                            {ref && (ref.type === 'mc' || ref.type === 'msq') ? 'Correct Answer' : 'Reference Answer'}
                          </p>
                          <p className="text-academy-muted text-sm leading-relaxed italic border-l-2 border-academy-gold/20 pl-3 whitespace-pre-line">
                            {refText}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grading panel */}
              <div className="border-t border-academy-gold/20 pt-8">
                <p className="font-mono text-academy-gold text-xs uppercase tracking-widest mb-3">
                  Admin Notes <span className="text-academy-muted normal-case">(shown to student)</span>
                </p>
                <textarea
                  className="w-full bg-navy border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:border-academy-gold focus:outline-none text-sm resize-none leading-relaxed mb-5"
                  rows={4}
                  placeholder="Optional feedback for the student…"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleGrade('passed')}
                    disabled={grading}
                    className="bg-green-700 hover:bg-green-600 text-white font-semibold rounded-lg px-5 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {grading ? '…' : '✓ Pass'}
                  </button>
                  <button
                    onClick={() => handleGrade('failed')}
                    disabled={grading}
                    className="bg-red-800 hover:bg-red-700 text-white font-semibold rounded-lg px-5 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {grading ? '…' : '✗ Needs Revision'}
                  </button>
                  {selected.graded_at && (
                    <span className="text-academy-muted text-xs">
                      Last graded {fmt(selected.graded_at)}
                    </span>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
