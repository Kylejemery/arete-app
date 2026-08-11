'use client';

// The composer — the Interlocutor Studio. A long-form editor and one explicit
// invocation, as before, but the response is now marked up in place: the draft
// is snapshotted as an immutable version and returned with annotations anchored
// to the sentences that earned them, colored by severity, some carrying a
// concrete rewrite the student accepts or rejects.
//
// The loop the studio adds: write -> submit for markup -> accept/dismiss and
// revise -> submit again as the next version, with the version rail showing the
// argument getting less red over time. Revision happens back in the textarea
// (academy has no rich-text editor), so accepting a rewrite repopulates the
// editor rather than mutating the reviewed snapshot.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InterlocutorChat, MIN_CRITIQUE_CHARS as MIN_CHARS } from '@/components/InterlocutorPanel';
import { MarkedUpDraft, type Annotation } from '@/components/MarkedUpDraft';
import { DraftHistory, type DraftSummary } from '@/components/DraftHistory';
import { StageStepper } from '@/components/StageStepper';
import { applyAccepted, type AcceptedEdit } from '@/lib/annotations';
import { DEFAULT_STAGE, isStage, type Stage } from '@/lib/interlocutor';

const DRAFT_KEY = 'interlocutor-draft';
const TITLE_KEY = 'interlocutor-draft-title';
const PIECE_KEY = 'interlocutor-piece-id';

interface ReviewData {
  draftId: string;
  version: number;
  content: string;
  summary: string;
  annotations: Annotation[];
  generalNotes: Annotation[];
}

export default function ComposerPage() {
  const router = useRouter();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [pieceId, setPieceId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>(DEFAULT_STAGE);

  const [view, setView] = useState<'editor' | 'review'>('editor');
  const [review, setReview] = useState<ReviewData | null>(null);
  // The draft produced by this session's latest submit is editable; a version
  // opened from the rail is read-only.
  const [liveDraftId, setLiveDraftId] = useState<string | null>(null);
  const [history, setHistory] = useState<DraftSummary[]>([]);

  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Load the draft's version rail for the rail + counts ──────────────────────
  const loadHistory = useCallback(async (pid: string) => {
    const { data: drafts } = await supabase
      .from('piece_drafts')
      .select('id, version, created_at, word_count')
      .eq('piece_id', pid)
      .order('version', { ascending: false });
    const rows = (drafts as { id: string; version: number; created_at: string; word_count: number }[]) ?? [];
    if (rows.length === 0) {
      setHistory([]);
      return;
    }
    const ids = rows.map(r => r.id);
    const { data: anns } = await supabase
      .from('draft_annotations')
      .select('draft_id, severity')
      .in('draft_id', ids);
    const tally: Record<string, Record<string, number>> = {};
    for (const a of (anns as { draft_id: string; severity: string }[]) ?? []) {
      (tally[a.draft_id] ??= {})[a.severity] = ((tally[a.draft_id] ??= {})[a.severity] ?? 0) + 1;
    }
    setHistory(
      rows.map(r => ({
        id: r.id,
        version: r.version,
        created_at: r.created_at,
        wordCount: r.word_count,
        counts: tally[r.id] ?? {},
      }))
    );
  }, []);

  // ── Auth + restore ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      if (cancelled) return;
      let pid: string | null = null;
      try {
        setText(localStorage.getItem(DRAFT_KEY) ?? '');
        setTitle(localStorage.getItem(TITLE_KEY) ?? '');
        pid = localStorage.getItem(PIECE_KEY);
      } catch {}
      if (pid) {
        setPieceId(pid);
        const { data: piece } = await supabase
          .from('writing_pieces')
          .select('stage')
          .eq('id', pid)
          .maybeSingle();
        const st = (piece as { stage?: string } | null)?.stage;
        if (isStage(st)) setStage(st);
        await loadHistory(pid);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [router, loadHistory]);

  const handleTextChange = (v: string) => {
    setText(v);
    try { localStorage.setItem(DRAFT_KEY, v); } catch {}
  };
  const handleTitleChange = (v: string) => {
    setTitle(v);
    try { localStorage.setItem(TITLE_KEY, v); } catch {}
  };

  const submission = text.trim();
  const canSubmit = submission.length >= MIN_CHARS && !working;
  const words = useMemo(() => (submission ? submission.split(/\s+/).length : 0), [submission]);

  // ── Submit for markup ─────────────────────────────────────────────────────────
  const invoke = async () => {
    if (!canSubmit) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/interlocutor/annotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pieceId: pieceId || undefined,
          title: title.trim() || undefined,
          draftContent: text,
          stage,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'The Interlocutor is unavailable.');
        return;
      }
      const d = data as {
        pieceId: string;
        draftId: string;
        version: number;
        summary: string;
        annotations: Annotation[];
        generalNotes: Annotation[];
        recorded: boolean;
      };
      setPieceId(d.pieceId);
      try { localStorage.setItem(PIECE_KEY, d.pieceId); } catch {}
      setReview({
        draftId: d.draftId,
        version: d.version,
        content: text,
        summary: d.summary,
        annotations: d.annotations ?? [],
        generalNotes: d.generalNotes ?? [],
      });
      setLiveDraftId(d.draftId);
      setView('review');
      if (!d.recorded) {
        setNotice('This pass was not written to your history, so it will not shape your profile.');
      }
      await loadHistory(d.pieceId);
    } catch {
      setError('The Interlocutor could not be reached.');
    } finally {
      setWorking(false);
    }
  };

  // ── Accept / dismiss on the live draft ────────────────────────────────────────
  const setAnnStatus = async (a: Annotation, status: 'accepted' | 'dismissed') => {
    setReview(prev =>
      prev
        ? {
            ...prev,
            annotations: prev.annotations.map(x => (x.id === a.id ? { ...x, status } : x)),
            generalNotes: prev.generalNotes.map(x => (x.id === a.id ? { ...x, status } : x)),
          }
        : prev
    );
    const { error: upErr } = await supabase
      .from('draft_annotations')
      .update({ status })
      .eq('id', a.id);
    if (upErr) {
      setNotice('That change did not save. It will apply here but may not persist.');
    }
  };

  const acceptedEdits: AcceptedEdit[] = useMemo(() => {
    if (!review) return [];
    return review.annotations
      .filter(a => a.status === 'accepted' && a.start_offset !== null && a.end_offset !== null && a.suggestion)
      .map(a => ({
        start: a.start_offset as number,
        end: a.end_offset as number,
        suggestion: a.suggestion as string,
      }));
  }, [review]);

  // Carry the reviewed version (with accepted rewrites spliced in) back into the
  // editor. The next submit becomes the following version.
  const reviseInEditor = () => {
    if (!review) return;
    const revised = applyAccepted(review.content, acceptedEdits);
    handleTextChange(revised);
    setView('editor');
    setNotice(
      acceptedEdits.length
        ? `${acceptedEdits.length} accepted rewrite${acceptedEdits.length === 1 ? '' : 's'} applied. Keep revising, then submit again for the next draft.`
        : 'Back in the editor. Keep revising, then submit again for the next draft.'
    );
  };

  // ── Open a past version from the rail (read-only) ──────────────────────────────
  const openDraft = async (draftId: string) => {
    setError(null);
    const { data: draft } = await supabase
      .from('piece_drafts')
      .select('id, version, content')
      .eq('id', draftId)
      .maybeSingle();
    if (!draft) { setError('That draft could not be opened.'); return; }
    const d = draft as { id: string; version: number; content: string };
    const { data: anns } = await supabase
      .from('draft_annotations')
      .select('id, start_offset, end_offset, quote, dimension, severity, comment, suggestion, status')
      .eq('draft_id', draftId);
    const all = (anns as Annotation[]) ?? [];
    setReview({
      draftId: d.id,
      version: d.version,
      content: d.content,
      summary: '',
      annotations: all.filter(a => a.start_offset !== null),
      generalNotes: all.filter(a => a.start_offset === null),
    });
    setView('review');
  };

  // Set the guided-flow stage. Non-blocking; persists to the piece when one
  // exists, otherwise rides along on the next submit.
  const changeStage = async (s: Stage) => {
    setStage(s);
    if (pieceId) {
      const { error: upErr } = await supabase
        .from('writing_pieces')
        .update({ stage: s })
        .eq('id', pieceId);
      if (upErr) setNotice('The stage change did not save, but it applies here.');
    }
  };

  const newPiece = () => {
    setPieceId(null);
    setReview(null);
    setLiveDraftId(null);
    setHistory([]);
    setStage(DEFAULT_STAGE);
    setView('editor');
    handleTitleChange('');
    handleTextChange('');
    try { localStorage.removeItem(PIECE_KEY); } catch {}
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-academy-muted italic text-sm">Opening the composer…</p>
      </div>
    );
  }

  const reviewReadOnly = review ? review.draftId !== liveDraftId : true;

  return (
    <div className="max-w-6xl">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-academy-gold text-xs uppercase tracking-[0.3em] mb-2">
            The Interlocutor
          </p>
          <p className="text-academy-muted text-sm leading-relaxed max-w-2xl">
            Write the argument, then submit it for markup. The Interlocutor returns your
            draft marked up in place: each judgment fastened to the sentence that earned it,
            colored by how much it costs the argument. Where a fix is better shown than
            described, it offers a rewrite you can accept or reject. Revise, and submit again.
          </p>
        </div>
        {(pieceId || text.trim()) && (
          <button
            onClick={newPiece}
            className="flex-shrink-0 font-mono text-[10px] uppercase tracking-wider text-academy-muted hover:text-academy-text border border-academy-border rounded px-3 py-1.5"
          >
            New piece
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-8 items-start">
        <div className="min-w-0">
          {view === 'editor' ? (
            <>
              <StageStepper stage={stage} onChange={changeStage} />
              <input
                className="w-full bg-transparent border-b border-academy-border focus:border-academy-gold focus:outline-none font-serif text-academy-text text-2xl pb-2 mb-6 placeholder-academy-muted"
                placeholder="Untitled"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
              />

              <textarea
                ref={editorRef}
                className="w-full min-h-[55vh] bg-navy border border-academy-border rounded-lg px-5 py-4 font-serif text-academy-text text-[15px] leading-[1.8] placeholder-academy-muted focus:border-academy-gold focus:outline-none resize-y"
                placeholder="Begin."
                value={text}
                onChange={e => handleTextChange(e.target.value)}
              />

              <div className="flex items-center justify-between mt-2 text-xs text-academy-muted font-mono">
                <span>{words} word{words === 1 ? '' : 's'}</span>
                {review && (
                  <button onClick={() => setView('review')} className="hover:text-academy-text">
                    ← back to the markup
                  </button>
                )}
              </div>

              <div className="mt-8 border-t border-academy-gold/20 pt-6 flex flex-wrap items-center gap-4">
                <button
                  onClick={invoke}
                  disabled={!canSubmit}
                  className="bg-academy-gold text-academy-bg font-semibold rounded-lg px-6 py-3 text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {working ? 'Reading…' : review ? 'Submit the next draft' : 'Submit for markup'}
                </button>
                {submission.length > 0 && submission.length < MIN_CHARS && (
                  <span className="text-academy-muted text-xs">Too little to judge.</span>
                )}
              </div>
            </>
          ) : (
            review && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-academy-gold text-xs uppercase tracking-widest">
                      Draft v{review.version}
                    </span>
                    {reviewReadOnly && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-academy-muted">
                        read-only
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {!reviewReadOnly && (
                      <button
                        onClick={reviseInEditor}
                        className="bg-academy-gold text-academy-bg font-semibold rounded-lg px-4 py-2 text-xs hover:opacity-90"
                      >
                        {acceptedEdits.length
                          ? `Apply ${acceptedEdits.length} & revise`
                          : 'Revise in editor'}
                      </button>
                    )}
                    <button
                      onClick={() => setView('editor')}
                      className="border border-academy-border text-academy-muted hover:text-academy-text rounded-lg px-4 py-2 text-xs"
                    >
                      To editor
                    </button>
                  </div>
                </div>

                <MarkedUpDraft
                  content={review.content}
                  annotations={review.annotations}
                  generalNotes={review.generalNotes}
                  summary={review.summary || undefined}
                  readOnly={reviewReadOnly}
                  onAccept={a => setAnnStatus(a, 'accepted')}
                  onDismiss={a => setAnnStatus(a, 'dismissed')}
                />
              </>
            )
          )}

          {notice && <p className="text-academy-gold text-xs mt-4 leading-relaxed">{notice}</p>}
          {error && <p className="text-red-400 text-xs mt-4">{error}</p>}
        </div>

        {/* ── The version rail ─────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-4">
          <DraftHistory
            versions={history}
            activeDraftId={review?.draftId ?? null}
            onSelect={openDraft}
          />
        </div>
      </div>

      {/* ── Conversation, anchored to the draft ──────────────────────────────── */}
      <section className="mt-12 border-t border-academy-gold/20 pt-6 max-w-3xl">
        <p className="font-mono text-academy-gold text-xs uppercase tracking-widest mb-4">Ask</p>
        {text.trim().length >= MIN_CHARS ? (
          <InterlocutorChat
            key={review?.draftId ?? 'no-draft'}
            excerpt={review?.content ?? text}
            pieceTitle={title}
            placeholder="Ask about the draft, or push back on a judgment…"
          />
        ) : (
          <p className="text-academy-muted text-sm leading-relaxed">
            The conversation is anchored to the draft, so it opens once there is a draft to
            anchor it to. Write a few sentences above.
          </p>
        )}
      </section>
    </div>
  );
}
