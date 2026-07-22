'use client';

// The Dissertation — the doctoral program's summit.
//
// Stages: proposal (Writing Supervisor approves the topic) → writing
// (chapters drafted and reviewed until at least four are approved) →
// defense (an oral viva with the Examiner over the thesis itself) →
// completed. State lives in `dissertations` + `dissertation_chapters`.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AskInterlocutor } from '@/components/InterlocutorPanel';

const MIN_APPROVED_CHAPTERS = 4;
const MAX_CHAPTERS = 8;

interface Dissertation {
  id: string;
  title: string | null;
  abstract: string | null;
  status: 'proposal' | 'proposal_approved' | 'writing' | 'defense' | 'completed';
  proposal_feedback: string | null;
}

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  content: string;
  status: 'draft' | 'reviewed' | 'approved';
  feedback: string | null;
}

const STAGES = ['Proposal', 'Chapters', 'Defense', 'Complete'] as const;

function stageIndex(status: Dissertation['status'] | null): number {
  switch (status) {
    case 'writing': case 'proposal_approved': return 1;
    case 'defense': return 2;
    case 'completed': return 3;
    default: return 0;
  }
}

export default function DissertationPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [diss, setDiss] = useState<Dissertation | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Proposal form
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [submittingProposal, setSubmittingProposal] = useState(false);

  // Chapter workspace
  const [openChapter, setOpenChapter] = useState<number | null>(null);
  const [busyChapter, setBusyChapter] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }
      setUserId(user.id);
      const [dRes, cRes] = await Promise.all([
        supabase.from('dissertations').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('dissertation_chapters').select('*').eq('user_id', user.id).order('chapter_number'),
      ]);
      if (cancelled) return;
      if (dRes.data) {
        setDiss(dRes.data as Dissertation);
        setTitle(dRes.data.title ?? '');
        setAbstract(dRes.data.abstract ?? '');
      }
      setChapters((cRes.data ?? []) as Chapter[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const submitProposal = async () => {
    if (!userId || submittingProposal) return;
    setSubmittingProposal(true);
    setError(null);
    try {
      const res = await fetch('/api/academy/dissertation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'proposal-review', title, abstract }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Review failed (${res.status})`);
      }
      const review = (await res.json()) as { approved: boolean; feedback: string };
      const status = review.approved ? 'writing' : 'proposal';
      const { data, error: upErr } = await supabase
        .from('dissertations')
        .upsert(
          {
            user_id: userId,
            title,
            abstract,
            status,
            proposal_feedback: review.feedback,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();
      if (upErr) throw new Error(upErr.message);
      setDiss(data as Dissertation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const ensureChapter = async (n: number) => {
    if (!userId) return;
    const existing = chapters.find(c => c.chapter_number === n);
    if (existing) { setOpenChapter(n); return; }
    const { data } = await supabase
      .from('dissertation_chapters')
      .insert({ user_id: userId, chapter_number: n, title: '', content: '' })
      .select()
      .single();
    if (data) {
      setChapters(prev => [...prev, data as Chapter].sort((a, b) => a.chapter_number - b.chapter_number));
      setOpenChapter(n);
    }
  };

  const updateChapterLocal = (n: number, patch: Partial<Chapter>) => {
    setChapters(prev => prev.map(c => (c.chapter_number === n ? { ...c, ...patch } : c)));
  };

  const saveChapter = async (n: number) => {
    const ch = chapters.find(c => c.chapter_number === n);
    if (!ch || !userId) return;
    await supabase
      .from('dissertation_chapters')
      .update({ title: ch.title, content: ch.content, updated_at: new Date().toISOString() })
      .eq('id', ch.id);
  };

  const submitChapter = async (n: number) => {
    const ch = chapters.find(c => c.chapter_number === n);
    if (!ch || !diss || busyChapter !== null) return;
    setBusyChapter(n);
    setError(null);
    try {
      await saveChapter(n);
      const res = await fetch('/api/academy/dissertation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chapter-review',
          dissertationTitle: diss.title,
          abstract: diss.abstract,
          chapterNumber: n,
          chapterTitle: ch.title,
          content: ch.content,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Review failed (${res.status})`);
      }
      const review = (await res.json()) as { approved: boolean; feedback: string; strengths: string[]; revisions: string[] };
      const status = review.approved ? 'approved' : 'reviewed';
      const feedback = [
        review.feedback,
        review.strengths.length ? `\nStrengths:\n${review.strengths.map(s => `• ${s}`).join('\n')}` : '',
        review.revisions.length ? `\nRevisions:\n${review.revisions.map(s => `• ${s}`).join('\n')}` : '',
      ].join('\n');
      await supabase
        .from('dissertation_chapters')
        .update({ status, feedback, updated_at: new Date().toISOString() })
        .eq('id', ch.id);
      updateChapterLocal(n, { status, feedback });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Review failed.');
    } finally {
      setBusyChapter(null);
    }
  };

  const approvedCount = chapters.filter(c => c.status === 'approved').length;

  const proceedToDefense = async () => {
    if (!diss || approvedCount < MIN_APPROVED_CHAPTERS) return;
    const { data } = await supabase
      .from('dissertations')
      .update({ status: 'defense', updated_at: new Date().toISOString() })
      .eq('id', diss.id)
      .select()
      .single();
    if (data) setDiss(data as Dissertation);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-academy-muted italic text-sm">Opening your file…</p>
      </div>
    );
  }

  const stage = stageIndex(diss?.status ?? null);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
          The Doctoral Dissertation
        </p>
        <h1 className="font-serif text-3xl text-academy-text mb-4">
          {diss?.title || 'Your Dissertation'}
        </h1>
        {/* Stage indicator */}
        <div className="flex items-center gap-2">
          {STAGES.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`text-xs font-mono uppercase tracking-widest ${
                i < stage ? 'text-green-400' : i === stage ? 'text-academy-gold font-semibold' : 'text-academy-muted/50'
              }`}>
                {i < stage ? '✓ ' : ''}{s}
              </span>
              {i < STAGES.length - 1 && <span className="text-academy-border">—</span>}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

      {/* ── Stage 0: Proposal ── */}
      {stage === 0 && (
        <div>
          <p className="text-academy-muted text-sm leading-relaxed mb-6">
            The dissertation is the summit of the program: a sustained original argument in Stoic
            philosophy, written chapter by chapter under the Writing Supervisor and defended before
            the Examiner. Begin with a proposal — a title and an abstract stating your thesis, the
            primary sources you will engage, and what your contribution is. The Supervisor will
            approve it or return it with directions.
          </p>
          {diss?.proposal_feedback && (
            <div className="mb-6 border-l-2 border-academy-gold/40 pl-4">
              <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-2">
                The Supervisor&rsquo;s Response — Revision Required
              </p>
              <p className="text-academy-text text-sm leading-relaxed whitespace-pre-line">{diss.proposal_feedback}</p>
            </div>
          )}
          <label className="block text-academy-muted text-xs font-semibold uppercase tracking-widest mb-2">Title</label>
          <input
            className="w-full bg-navy border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:border-academy-gold focus:outline-none text-sm mb-5"
            placeholder="e.g. The Open Hand: Stoic Attachment and the Ethics of Loss"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <label className="block text-academy-muted text-xs font-semibold uppercase tracking-widest mb-2">
            Abstract <span className="normal-case font-normal">(thesis, sources, contribution — 150+ words)</span>
          </label>
          <textarea
            className="w-full bg-navy border border-academy-border rounded-lg px-4 py-3 text-academy-text placeholder-academy-muted focus:border-academy-gold focus:outline-none text-sm resize-none leading-relaxed mb-5"
            rows={10}
            value={abstract}
            onChange={e => setAbstract(e.target.value)}
          />
          <button
            onClick={submitProposal}
            disabled={submittingProposal || !title.trim() || abstract.trim().length < 100}
            className="bg-academy-gold text-navy font-semibold rounded-lg px-6 py-3 text-sm hover:opacity-90 disabled:opacity-40"
          >
            {submittingProposal ? 'The Supervisor is reading…' : 'Submit Proposal'}
          </button>
        </div>
      )}

      {/* ── Stage 1: Chapters ── */}
      {stage === 1 && diss && (
        <div>
          {diss.proposal_feedback && (
            <div className="mb-8 border-l-2 border-green-500/40 pl-4">
              <p className="text-green-400 text-xs font-semibold uppercase tracking-widest mb-2">
                Proposal Approved
              </p>
              <p className="text-academy-muted text-sm leading-relaxed whitespace-pre-line">{diss.proposal_feedback}</p>
            </div>
          )}
          <p className="text-academy-muted text-sm leading-relaxed mb-6">
            Write the dissertation chapter by chapter. Submit each draft to the Writing Supervisor;
            a chapter is done when approved. <span className="text-academy-text font-semibold">{approvedCount}</span> of{' '}
            {MIN_APPROVED_CHAPTERS} required chapters approved.
          </p>

          <div className="space-y-3 mb-8">
            {Array.from({ length: Math.min(MAX_CHAPTERS, Math.max(MIN_APPROVED_CHAPTERS, chapters.length + 1)) }, (_, i) => i + 1).map(n => {
              const ch = chapters.find(c => c.chapter_number === n);
              const open = openChapter === n;
              return (
                <div key={n} className="border border-academy-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => (ch ? setOpenChapter(open ? null : n) : ensureChapter(n))}
                    className="w-full px-5 py-3.5 flex items-center justify-between bg-academy-card hover:bg-academy-card/70 transition-colors"
                  >
                    <span className="text-academy-text text-sm font-medium">
                      <span className="text-academy-gold font-mono mr-2">Ch. {n}</span>
                      {ch?.title || (ch ? 'Untitled' : 'Begin this chapter…')}
                    </span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest font-semibold ${
                      ch?.status === 'approved' ? 'text-green-400' : ch?.status === 'reviewed' ? 'text-academy-gold' : 'text-academy-muted'
                    }`}>
                      {ch ? (ch.status === 'approved' ? 'Approved ✓' : ch.status === 'reviewed' ? 'Revise' : 'Draft') : ''}
                    </span>
                  </button>
                  {open && ch && (
                    <div className="px-5 py-4 border-t border-academy-border bg-navy/40">
                      <input
                        className="w-full bg-navy border border-academy-border rounded-lg px-3.5 py-2.5 text-academy-text text-sm mb-3 focus:border-academy-gold focus:outline-none"
                        placeholder="Chapter title"
                        value={ch.title}
                        onChange={e => updateChapterLocal(n, { title: e.target.value })}
                        onBlur={() => saveChapter(n)}
                      />
                      <textarea
                        className="w-full bg-navy border border-academy-border rounded-lg px-3.5 py-2.5 text-academy-text text-sm resize-y leading-relaxed mb-3 focus:border-academy-gold focus:outline-none"
                        rows={14}
                        placeholder="Paste or write the chapter draft here…"
                        value={ch.content}
                        onChange={e => updateChapterLocal(n, { content: e.target.value })}
                        onBlur={() => saveChapter(n)}
                      />
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => submitChapter(n)}
                          disabled={busyChapter !== null || ch.content.trim().length < 500}
                          className="bg-academy-gold text-navy font-semibold rounded-lg px-4 py-2 text-xs hover:opacity-90 disabled:opacity-40"
                        >
                          {busyChapter === n ? 'The Supervisor is reading…' : 'Submit for Review'}
                        </button>
                        <span className="text-academy-muted text-xs font-mono">
                          {ch.content.trim().length.toLocaleString()} chars
                        </span>
                      </div>

                      {/* Formative pass, before the Supervisor's review. */}
                      <div className="mt-4 pt-4 border-t border-academy-border">
                        <AskInterlocutor
                          text={ch.content}
                          pieceTitle={ch.title ? `Ch. ${n}: ${ch.title}` : `Chapter ${n}`}
                        />
                      </div>
                      {ch.feedback && (
                        <div className="mt-4 border-l-2 border-academy-gold/40 pl-4">
                          <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-2">
                            The Supervisor&rsquo;s Feedback
                          </p>
                          <p className="text-academy-muted text-sm leading-relaxed whitespace-pre-line">{ch.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-academy-gold/20 pt-6">
            <button
              onClick={proceedToDefense}
              disabled={approvedCount < MIN_APPROVED_CHAPTERS}
              className="bg-academy-gold text-navy font-semibold rounded-lg px-6 py-3 text-sm hover:opacity-90 disabled:opacity-40"
            >
              Proceed to the Defense
            </button>
            {approvedCount < MIN_APPROVED_CHAPTERS && (
              <p className="text-academy-muted text-xs mt-2">
                The defense opens when {MIN_APPROVED_CHAPTERS} chapters are approved.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Stage 2: Defense ── */}
      {stage === 2 && diss && (
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-full border border-academy-gold/40 flex items-center justify-center mx-auto mb-6">
            <span className="text-academy-gold font-serif text-2xl">&Xi;</span>
          </div>
          <h2 className="font-serif text-2xl text-academy-text mb-3">The Defense</h2>
          <p className="text-academy-muted text-sm leading-relaxed max-w-md mx-auto mb-8">
            Your chapters are approved. What remains is the oral defense: the Examiner will
            question you on your thesis — its claims, its sources, its weakest points — and
            render the final verdict of the doctoral program.
          </p>
          <Link
            href="/dashboard/viva/dissertation"
            className="inline-block bg-academy-gold text-navy font-semibold rounded-lg px-8 py-3 text-sm hover:opacity-90"
          >
            Enter the Defense
          </Link>
        </div>
      )}

      {/* ── Stage 3: Complete ── */}
      {stage === 3 && diss && (
        <div className="text-center py-8">
          <p className="text-5xl mb-6">🏛️</p>
          <h2 className="font-serif text-3xl text-academy-text mb-3">The Doctorate Is Complete</h2>
          <p className="font-serif text-academy-gold text-lg italic mb-6">&ldquo;{diss.title}&rdquo;</p>
          <p className="text-academy-muted text-sm leading-relaxed max-w-md mx-auto mb-3">
            Defended and done. Seneca left his friends the pattern of his life; you have written
            yours down and defended it aloud. The Academy has nothing further to require —
            only the practice, which never ends.
          </p>
          <p className="text-academy-muted text-xs italic">Vindica te tibi.</p>
        </div>
      )}
    </div>
  );
}
