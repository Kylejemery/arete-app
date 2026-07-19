'use client';

// The Qualifying Examination — an assessed oral viva with the Examiner.
//
// Six questions, one at a time. Answers are not evaluated mid-exam; after the
// final answer the Examiner deliberates and renders a structured verdict,
// recorded to session_progress as course_id `<courseId>-viva` (session 1).
// A failed viva may be retaken. The in-progress transcript survives refresh
// via localStorage.

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const QUESTION_COUNT = 6;

const COURSE_TITLES: Record<string, string> = {
  'phil-701': 'The Art of Living — Foundations',
  'phil-702': 'Living the Practice — Marcus Aurelius',
  'phil-703': 'The School of Epictetus',
  'phil-704': 'The Examined Correspondence — Seneca',
  'phil-706': 'The Impossibility of Willing Evil',
  'phil-707': 'The Prokopton in the Digital Age',
  'dissertation': 'The Doctoral Defense',
};

interface Msg { role: 'user' | 'assistant'; content: string }

interface Verdict {
  verdict: 'passed' | 'failed';
  assessment: string;
  strengths: string[];
  weaknesses: string[];
}

type Phase = 'intro' | 'exam' | 'deliberating' | 'verdict';

export default function VivaPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const courseTitle = COURSE_TITLES[courseId];
  const storageKey = `viva-${courseId}`;

  const [phase, setPhase] = useState<Phase>('intro');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [priorPassed, setPriorPassed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  // For the dissertation defense: syllabus context built from the thesis.
  const [context, setContext] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const answered = messages.filter(m => m.role === 'user').length;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, phase]);

  // Load prior viva result + any in-progress transcript
  useEffect(() => {
    if (!courseTitle) { router.replace('/dashboard'); return; }
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !cancelled) {
        // Dissertation defense: build the Examiner's context from the thesis.
        if (courseId === 'dissertation') {
          const [dRes, cRes] = await Promise.all([
            supabase.from('dissertations').select('title, abstract').eq('user_id', user.id).maybeSingle(),
            supabase.from('dissertation_chapters').select('chapter_number, title, status').eq('user_id', user.id).order('chapter_number'),
          ]);
          if (!dRes.data?.title) {
            if (!cancelled) router.replace('/dashboard/dissertation');
            return;
          }
          const chapterList = (cRes.data ?? [])
            .filter(c => c.status === 'approved')
            .map(c => `Chapter ${c.chapter_number}: ${c.title}`)
            .join('; ');
          setContext(
            `DISSERTATION DEFENSE. The candidate is defending their doctoral dissertation in Stoic philosophy. ` +
            `Title: "${dRes.data.title}". Abstract: ${dRes.data.abstract ?? ''}. Approved chapters: ${chapterList}. ` +
            `Examine the THESIS itself: its central claim, its use of primary Stoic sources, its weakest premise, ` +
            `the strongest objection to it, its relation to the doctrines of the PHIL 701-704 sequence, and what ` +
            `the candidate's own practice owes to the argument. This is a defense — press harder than a course viva.`
          );
        }
        const { data } = await supabase
          .from('session_progress')
          .select('status, grading')
          .eq('user_id', user.id)
          .eq('course_id', `${courseId}-viva`)
          .eq('session_id', 1)
          .maybeSingle();
        if (!cancelled && data?.grading && (data.status === 'passed' || data.status === 'failed')) {
          setVerdict(data.grading as Verdict);
          setPriorPassed(data.status === 'passed');
          setPhase('verdict');
          setInitializing(false);
          return;
        }
      }
      // Resume an in-progress exam if one exists
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored && !cancelled) {
          const parsed = JSON.parse(stored) as Msg[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            setPhase('exam');
          }
        }
      } catch {}
      if (!cancelled) setInitializing(false);
    })();
    return () => { cancelled = true; };
  }, [courseId, courseTitle, router, storageKey]);

  const callViva = async (mode: 'question' | 'verdict', msgs: Msg[]) => {
    const res = await fetch('/api/academy/viva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, courseId, messages: msgs, ...(context ? { context } : {}) }),
    });
    if (!res.ok) throw new Error(`Examiner unavailable (${res.status})`);
    return res.json();
  };

  const begin = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callViva('question', []);
      const next: Msg[] = [{ role: 'assistant', content: data.message }];
      setMessages(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
      setPhase('exam');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not begin the examination.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    const withAnswer: Msg[] = [...messages, { role: 'user', content: input.trim() }];
    setMessages(withAnswer);
    setInput('');
    localStorage.setItem(storageKey, JSON.stringify(withAnswer));
    try {
      const nowAnswered = withAnswer.filter(m => m.role === 'user').length;
      if (nowAnswered >= QUESTION_COUNT) {
        // Final answer given — the Examiner deliberates
        setPhase('deliberating');
        const v = (await callViva('verdict', withAnswer)) as Verdict;
        await recordVerdict(v, withAnswer);
        setVerdict(v);
        setPriorPassed(v.verdict === 'passed');
        setPhase('verdict');
        localStorage.removeItem(storageKey);
      } else {
        const data = await callViva('question', withAnswer);
        const next: Msg[] = [...withAnswer, { role: 'assistant', content: data.message }];
        setMessages(next);
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The Examiner is unavailable. Your answers are saved — try again.');
      if (phase === 'deliberating') setPhase('exam');
    } finally {
      setLoading(false);
    }
  };

  const recordVerdict = async (v: Verdict, transcript: Msg[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('session_progress').upsert(
      {
        user_id: user.id,
        course_id: `${courseId}-viva`,
        session_id: 1,
        status: v.verdict,
        submitted_answers: transcript,
        grading: v,
        score: v.verdict === 'passed' ? 100 : 0,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course_id,session_id' }
    );
    // A passed defense completes the dissertation.
    if (courseId === 'dissertation' && v.verdict === 'passed') {
      await supabase
        .from('dissertations')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }
  };

  const retake = () => {
    setMessages([]);
    setVerdict(null);
    setPhase('intro');
    try { localStorage.removeItem(storageKey); } catch {}
  };

  if (!courseTitle) return null;

  if (initializing) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <p className="font-serif text-academy-muted italic text-sm">The Examiner is expecting you…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy">
      <header className="h-14 flex items-center justify-between px-6 border-b border-academy-border bg-academy-card">
        <div className="flex items-center gap-4">
          <Link
            href={courseId === 'dissertation' ? '/dashboard/dissertation' : `/dashboard/courses/${courseId}`}
            className="text-academy-muted hover:text-academy-gold text-sm transition-colors"
          >
            &larr; {courseId === 'dissertation' ? 'Dissertation' : courseId.toUpperCase().replace('PHIL-', 'PHIL ')}
          </Link>
          <span className="text-academy-border text-xs select-none">|</span>
          <span className="text-academy-gold font-serif text-sm">Qualifying Examination</span>
        </div>
        {phase === 'exam' && (
          <span className="font-mono text-xs text-academy-muted">
            Question {Math.min(answered + 1, QUESTION_COUNT)} of {QUESTION_COUNT}
          </span>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* ── Intro ── */}
        {phase === 'intro' && (
          <div className="text-center py-12">
            <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-2">
              {courseId.toUpperCase().replace('PHIL-', 'PHIL ')}
            </p>
            <h1 className="font-serif text-3xl text-academy-text mb-4">{courseTitle}</h1>
            <div className="w-14 h-14 rounded-full border border-academy-gold/40 flex items-center justify-center mx-auto mb-6">
              <span className="text-academy-gold font-serif text-2xl">&Xi;</span>
            </div>
            <p className="text-academy-muted text-sm leading-relaxed max-w-md mx-auto mb-3">
              The Examiner will put {QUESTION_COUNT} questions to you, one at a time, ranging
              across the whole course. Answer in your own words — recitation does not pass a viva.
              You will receive no evaluation until the examination is complete.
            </p>
            <p className="text-academy-muted text-xs italic max-w-md mx-auto mb-8">
              A failed examination may be retaken. Your transcript is preserved if you leave mid-exam.
            </p>
            <button
              onClick={begin}
              disabled={loading}
              className="bg-academy-gold text-navy font-semibold rounded-lg px-8 py-3 text-sm hover:opacity-90 disabled:opacity-40"
            >
              {loading ? 'The Examiner is preparing…' : 'Begin the Examination'}
            </button>
            {error && <p className="text-red-400 text-xs mt-4">{error}</p>}
          </div>
        )}

        {/* ── Exam ── */}
        {(phase === 'exam' || phase === 'deliberating') && (
          <>
            <div className="space-y-5 mb-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-academy-gold/15 text-academy-text border border-academy-gold/25'
                      : 'bg-academy-card text-academy-text border border-academy-border'
                  }`}>
                    {m.role === 'assistant' && (
                      <p className="text-academy-gold text-[10px] font-semibold uppercase tracking-widest mb-1.5">The Examiner</p>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && phase === 'exam' && (
                <p className="text-academy-muted text-sm italic">The Examiner is considering…</p>
              )}
              {phase === 'deliberating' && (
                <div className="text-center py-8">
                  <p className="font-serif text-academy-text italic">The Examiner is deliberating…</p>
                  <p className="text-academy-muted text-xs mt-2">Your verdict and written assessment are being prepared.</p>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {phase === 'exam' && (
              <div className="flex gap-2.5">
                <textarea
                  className="flex-1 bg-navy border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:border-academy-gold focus:outline-none text-sm resize-none leading-relaxed"
                  rows={4}
                  placeholder="Answer the Examiner…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={loading}
                />
                <button
                  onClick={submitAnswer}
                  disabled={loading || !input.trim()}
                  className="self-end bg-academy-gold text-navy font-semibold rounded-lg px-5 py-2.5 text-sm hover:opacity-90 disabled:opacity-40"
                >
                  Answer
                </button>
              </div>
            )}
            {error && phase === 'exam' && <p className="text-red-400 text-xs mt-3">{error}</p>}
          </>
        )}

        {/* ── Verdict ── */}
        {phase === 'verdict' && verdict && (
          <div>
            <div className={`rounded-xl px-6 py-5 border mb-8 ${
              priorPassed ? 'border-green-500/40 bg-green-500/10' : 'border-red-500/40 bg-red-500/10'
            }`}>
              <p className={`font-mono text-xs uppercase tracking-widest font-semibold mb-1 ${
                priorPassed ? 'text-green-400' : 'text-red-400'
              }`}>
                {priorPassed ? 'Qualifying Examination — Passed' : 'Qualifying Examination — Not Passed'}
              </p>
              <p className="font-serif text-xl text-academy-text">{courseTitle}</p>
            </div>

            <section className="mb-8">
              <h2 className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-3">
                The Examiner&rsquo;s Assessment
              </h2>
              <p className="text-academy-text text-sm leading-relaxed whitespace-pre-line">{verdict.assessment}</p>
            </section>

            {verdict.strengths.length > 0 && (
              <section className="mb-6">
                <h3 className="text-academy-muted text-xs font-semibold uppercase tracking-widest mb-2">Strengths</h3>
                <ul className="space-y-1.5">
                  {verdict.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-academy-text">
                      <span className="text-green-400 mt-0.5">✓</span><span>{s}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {verdict.weaknesses.length > 0 && (
              <section className="mb-8">
                <h3 className="text-academy-muted text-xs font-semibold uppercase tracking-widest mb-2">For Further Study</h3>
                <ul className="space-y-1.5">
                  {verdict.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-academy-muted">
                      <span className="text-academy-gold mt-0.5">&rsaquo;</span><span>{w}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="border-t border-academy-gold/20 pt-6 flex items-center gap-4">
              <Link
                href="/dashboard"
                className="bg-academy-gold text-navy font-semibold rounded-lg px-5 py-2.5 text-sm hover:opacity-90"
              >
                Return to Dashboard
              </Link>
              {!priorPassed && (
                <button
                  onClick={retake}
                  className="border border-academy-border text-academy-text rounded-lg px-5 py-2.5 text-sm hover:border-academy-gold transition-colors"
                >
                  Retake the Examination
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
