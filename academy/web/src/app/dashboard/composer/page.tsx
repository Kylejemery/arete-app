'use client';

// The composer, the Interlocutor Studio. One document, full height, with the
// Interlocutor's marks living in it rather than in a separate review screen.
//
// The loop: write, submit for markup, then work the margin. Accepting a rewrite
// splices it into the document you are already typing in, the way accepting a
// tracked change does in a word processor, and every other mark re-anchors
// itself around the edit. Rejecting clears the mark and leaves the sentence
// alone. When the marks are worked through, submit again and the next version
// is snapshotted, so the version rail still shows the argument getting less red
// over time.
//
// Text stays plain (markdown for headings, emphasis, quotations) because every
// annotation is a character offset into it. The toolbar writes that markdown for
// you, and the read view typesets it.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InterlocutorChat, MIN_CRITIQUE_CHARS as MIN_CHARS } from '@/components/InterlocutorPanel';
import { CommentList, MarkedUpText, SummaryLead, type Annotation } from '@/components/MarkedUpDraft';
import { DraftHistory, type DraftSummary } from '@/components/DraftHistory';
import { StageStepper } from '@/components/StageStepper';
import { DraftEditor, type DraftEditorHandle } from '@/components/DraftEditor';
import { ProsePage } from '@/components/ProsePage';
import { WorksList, type WorkSummary } from '@/components/WorksList';
import {
  acceptAllRewrites,
  acceptRewrite,
  diffRegion,
  reanchor,
  reanchorByQuote,
  type EditRegion,
  type SpanInput,
} from '@/lib/annotations';
import { DEFAULT_STAGE, isStage, STAGES, type Stage } from '@/lib/interlocutor';

const DRAFT_KEY = 'interlocutor-draft';
const TITLE_KEY = 'interlocutor-draft-title';
const PIECE_KEY = 'interlocutor-piece-id';
const ASIDE_KEY = 'interlocutor-aside-w';

// Each piece keeps its own working copy, so switching between works never costs
// you the unsubmitted edits in either. The bare key holds the scratch draft
// written before a piece exists (and the copy left by earlier versions of the
// composer, which knew only one draft).
const draftKey = (pieceId: string | null) => (pieceId ? `${DRAFT_KEY}:${pieceId}` : DRAFT_KEY);

const ANNOTATION_COLUMNS =
  'id, start_offset, end_offset, quote, dimension, severity, comment, suggestion, status';

interface Marks {
  draftId: string;
  version: number;
  summary: string;
  annotations: Annotation[]; // located and general together
}

interface PastDraft {
  id: string;
  version: number;
  content: string;
  annotations: Annotation[];
}

interface Snapshot {
  text: string;
  annotations: Annotation[];
  label: string;
}

type Pane = 'comments' | 'ask' | 'works';

// A mark that survives an edit somewhere else in the draft: see reanchor().
const shiftAnn = (a: Annotation, region: EditRegion, nextText: string) =>
  reanchor(a, region, nextText);

export default function ComposerPage() {
  const router = useRouter();
  const editorRef = useRef<DraftEditorHandle>(null);

  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [pieceId, setPieceId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>(DEFAULT_STAGE);

  const [userId, setUserId] = useState<string | null>(null);
  const [marks, setMarks] = useState<Marks | null>(null);
  const [past, setPast] = useState<PastDraft | null>(null);
  const [history, setHistory] = useState<DraftSummary[]>([]);
  const [works, setWorks] = useState<WorkSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [undoable, setUndoable] = useState<Snapshot | null>(null);

  const [mode, setMode] = useState<'write' | 'read'>('write');
  const [pane, setPane] = useState<Pane>('comments');
  const [asideW, setAsideW] = useState(360);
  const [showGuide, setShowGuide] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── The version rail ────────────────────────────────────────────────────────
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

  // ── Every piece the student has written ─────────────────────────────────────
  const loadWorks = useCallback(async (uid: string) => {
    const { data: pieces } = await supabase
      .from('writing_pieces')
      .select('id, title, stage, updated_at')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false });
    const rows = (pieces as { id: string; title: string; stage: string; updated_at: string }[]) ?? [];
    if (rows.length === 0) {
      setWorks([]);
      return;
    }
    const { data: drafts } = await supabase
      .from('piece_drafts')
      .select('piece_id, version, word_count')
      .eq('user_id', uid);
    const latest: Record<string, { version: number; words: number }> = {};
    for (const d of (drafts as { piece_id: string; version: number; word_count: number }[]) ?? []) {
      const cur = latest[d.piece_id];
      if (!cur || d.version > cur.version) latest[d.piece_id] = { version: d.version, words: d.word_count ?? 0 };
    }
    setWorks(
      rows.map(r => ({
        id: r.id,
        title: r.title ?? '',
        stage: r.stage,
        updatedAt: r.updated_at,
        versions: latest[r.id]?.version ?? 0,
        words: latest[r.id]?.words ?? 0,
      }))
    );
  }, []);

  // ── Auth, restore ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      if (cancelled) return;
      setUserId(user.id);
      let pid: string | null = null;
      try {
        pid = localStorage.getItem(PIECE_KEY);
        // The per-piece working copy, falling back to the single draft older
        // versions of the composer kept.
        setText(localStorage.getItem(draftKey(pid)) ?? localStorage.getItem(DRAFT_KEY) ?? '');
        setTitle(localStorage.getItem(TITLE_KEY) ?? '');
        const w = Number(localStorage.getItem(ASIDE_KEY));
        if (!Number.isNaN(w) && w >= 260) setAsideW(w);
      } catch {}
      if (pid) {
        setPieceId(pid);
        const { data: piece } = await supabase
          .from('writing_pieces')
          .select('title, stage')
          .eq('id', pid)
          .maybeSingle();
        const row = piece as { title?: string; stage?: string } | null;
        if (isStage(row?.stage)) setStage(row.stage);
        if (row?.title) setTitle(row.title);
        await loadHistory(pid);
      }
      await loadWorks(user.id);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [router, loadHistory, loadWorks]);

  const persistText = (v: string, pid: string | null = pieceId) => {
    try { localStorage.setItem(draftKey(pid), v); } catch {}
  };

  // Every keystroke re-bases the marks so a comment keeps pointing at the words
  // it was written about while the draft moves under it.
  const handleTextChange = (next: string) => {
    const region = diffRegion(text, next);
    setText(next);
    persistText(next);
    if (region) {
      setMarks(prev =>
        prev ? { ...prev, annotations: prev.annotations.map(a => shiftAnn(a, region, next)) } : prev
      );
    }
  };

  const handleTitleChange = (v: string) => {
    setTitle(v);
    try { localStorage.setItem(TITLE_KEY, v); } catch {}
  };

  const submission = text.trim();
  const canSubmit = submission.length >= MIN_CHARS && !working;
  const words = useMemo(() => (submission ? submission.split(/\s+/).length : 0), [submission]);

  const openMarks = useMemo(
    () => (marks ? marks.annotations.filter(a => a.status === 'open') : []),
    [marks]
  );
  const spans: SpanInput[] = useMemo(
    () =>
      openMarks
        .filter(a => a.start_offset !== null && a.end_offset !== null)
        .map(a => ({
          id: a.id,
          start: a.start_offset as number,
          end: a.end_offset as number,
          severity: a.severity,
        })),
    [openMarks]
  );
  const acceptable = useMemo(
    () => openMarks.filter(a => a.suggestion && a.start_offset !== null && a.end_offset !== null),
    [openMarks]
  );

  // ── Submit for markup ───────────────────────────────────────────────────────
  const invoke = async () => {
    if (!canSubmit) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    setPast(null);
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
      // A first submission is where a piece gets its id, so the scratch copy
      // becomes that piece's working copy.
      persistText(text, d.pieceId);
      setMarks({
        draftId: d.draftId,
        version: d.version,
        summary: d.summary,
        annotations: [...(d.annotations ?? []), ...(d.generalNotes ?? [])],
      });
      setUndoable(null);
      setPane('comments');
      setMode('write');
      if (!d.recorded) {
        setNotice('This pass was not written to your history, so it will not shape your profile.');
      }
      await loadHistory(d.pieceId);
      if (userId) await loadWorks(userId);
    } catch {
      setError('The Interlocutor could not be reached.');
    } finally {
      setWorking(false);
    }
  };

  // ── Accept and reject, in the document ──────────────────────────────────────
  const persistStatus = async (ids: string[], status: 'accepted' | 'dismissed') => {
    if (ids.length === 0) return;
    const { error: upErr } = await supabase
      .from('draft_annotations')
      .update({ status })
      .in('id', ids);
    if (upErr) setNotice('That change did not save. It applies here but may not persist.');
  };

  const snapshot = (label: string) => {
    if (marks) setUndoable({ text, annotations: marks.annotations, label });
  };

  const acceptOne = (a: Annotation) => {
    if (!marks) return;
    snapshot('accept');
    const r = acceptRewrite(text, marks.annotations, a.id);
    setText(r.content);
    persistText(r.content);
    setMarks({ ...marks, annotations: r.annotations });
    setActiveId(null);
    void persistStatus([a.id], 'accepted');
  };

  const rejectOne = (a: Annotation) => {
    if (!marks) return;
    snapshot('reject');
    setMarks(prev =>
      prev
        ? {
            ...prev,
            annotations: prev.annotations.map(x =>
              x.id === a.id ? { ...x, status: 'dismissed' } : x
            ),
          }
        : prev
    );
    setActiveId(null);
    void persistStatus([a.id], 'dismissed');
  };

  const acceptAll = () => {
    if (!marks || acceptable.length === 0) return;
    snapshot('accept all');
    const r = acceptAllRewrites(text, marks.annotations);
    setText(r.content);
    persistText(r.content);
    setMarks({ ...marks, annotations: r.annotations });
    setActiveId(null);
    setNotice(`${r.accepted.length} rewrite${r.accepted.length === 1 ? '' : 's'} applied to the draft.`);
    void persistStatus(r.accepted, 'accepted');
  };

  const rejectAll = () => {
    if (!marks || openMarks.length === 0) return;
    snapshot('reject all');
    const ids = openMarks.map(a => a.id);
    setMarks({
      ...marks,
      annotations: marks.annotations.map(a =>
        a.status === 'open' ? { ...a, status: 'dismissed' } : a
      ),
    });
    setActiveId(null);
    setNotice(`${ids.length} mark${ids.length === 1 ? '' : 's'} cleared.`);
    void persistStatus(ids, 'dismissed');
  };

  const undo = () => {
    if (!undoable || !marks) return;
    const before = undoable;
    const byId = new Map(before.annotations.map(a => [a.id, a.status]));
    const reopened = marks.annotations
      .filter(a => byId.get(a.id) === 'open' && a.status !== 'open')
      .map(a => a.id);
    setText(before.text);
    persistText(before.text);
    setMarks({ ...marks, annotations: before.annotations });
    setUndoable(null);
    setNotice(null);
    if (reopened.length) {
      void supabase.from('draft_annotations').update({ status: 'open' }).in('id', reopened);
    }
  };

  // ── Past versions, read-only ────────────────────────────────────────────────
  const openPast = async (draftId: string) => {
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
      .select(ANNOTATION_COLUMNS)
      .eq('draft_id', draftId);
    setPast({ id: d.id, version: d.version, content: d.content, annotations: (anns as Annotation[]) ?? [] });
    setActiveId(null);
    setPane('comments');
  };

  // ── Open another work ───────────────────────────────────────────────────────
  // The piece's own working copy if there is one, otherwise its latest draft.
  // The marks come from that draft, so they are re-anchored by quote whenever
  // the working copy has drifted from the text they were written against.
  const openPiece = async (id: string) => {
    if (id === pieceId) return;
    setError(null);
    setNotice(null);
    persistText(text);

    const { data: piece } = await supabase
      .from('writing_pieces')
      .select('id, title, stage')
      .eq('id', id)
      .maybeSingle();
    if (!piece) { setError('That work could not be opened.'); return; }
    const p = piece as { id: string; title: string | null; stage: string | null };

    const { data: latest } = await supabase
      .from('piece_drafts')
      .select('id, version, content')
      .eq('piece_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    const d = latest as { id: string; version: number; content: string } | null;

    let anns: Annotation[] = [];
    if (d) {
      const { data } = await supabase
        .from('draft_annotations')
        .select(ANNOTATION_COLUMNS)
        .eq('draft_id', d.id);
      anns = (data as Annotation[]) ?? [];
    }

    let saved: string | null = null;
    try { saved = localStorage.getItem(draftKey(id)); } catch {}
    const content = saved ?? d?.content ?? '';

    setPieceId(id);
    try { localStorage.setItem(PIECE_KEY, id); } catch {}
    handleTitleChange(p.title ?? '');
    setStage(isStage(p.stage) ? p.stage : DEFAULT_STAGE);
    setText(content);
    persistText(content, id);
    setMarks(
      d
        ? {
            draftId: d.id,
            version: d.version,
            summary: '',
            annotations:
              content === d.content ? anns : anns.map(a => reanchorByQuote(a, content)),
          }
        : null
    );
    setPast(null);
    setUndoable(null);
    setActiveId(null);
    setMode('write');
    await loadHistory(id);
    setNotice(
      d
        ? `Opened “${p.title?.trim() || 'Untitled'}” at draft v${d.version}.`
        : `Opened “${p.title?.trim() || 'Untitled'}”. It has no submitted drafts yet.`
    );
  };

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

  // Starting a new piece no longer puts the old one out of reach: it keeps its
  // working copy under its own key and stays in the Works list.
  const newPiece = () => {
    persistText(text);
    setPieceId(null);
    setMarks(null);
    setPast(null);
    setHistory([]);
    setUndoable(null);
    setStage(DEFAULT_STAGE);
    handleTitleChange('');
    setText('');
    persistText('', null);
    try { localStorage.removeItem(PIECE_KEY); } catch {}
    setNotice('New piece. Your other work is under Drafts, in the margin.');
  };

  // ── The draggable margin ────────────────────────────────────────────────────
  const dragRef = useRef(false);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const w = Math.min(640, Math.max(260, window.innerWidth - e.clientX));
      setAsideW(w);
    };
    const up = () => {
      if (!dragRef.current) return;
      dragRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setAsideW(w => {
        try { localStorage.setItem(ASIDE_KEY, String(Math.round(w))); } catch {}
        return w;
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  const focusMark = (id: string) => {
    setActiveId(id);
    const a = marks?.annotations.find(x => x.id === id) ?? past?.annotations.find(x => x.id === id);
    if (past) {
      document.getElementById(`mark-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (a && a.start_offset !== null && a.end_offset !== null && mode === 'write') {
      editorRef.current?.focusRange(a.start_offset, a.end_offset);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-academy-muted italic text-sm">Opening the composer…</p>
      </div>
    );
  }

  const stageLabel = STAGES.find(s => s.id === stage)?.label ?? '';
  const barBtn =
    'font-mono text-[10px] uppercase tracking-wider border border-academy-border rounded px-2.5 py-1.5 text-academy-muted hover:text-academy-text hover:border-academy-gold/50 transition-colors';

  return (
    <div className="flex flex-col h-[100dvh] pb-16 md:pb-0">
      {/* ── The bar over the page ───────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-academy-border bg-academy-bg">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <input
            className="flex-1 min-w-0 bg-transparent font-serif text-academy-text text-xl focus:outline-none placeholder-academy-muted/60"
            placeholder="Untitled"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
          />

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => setShowGuide(v => !v)} className={barBtn} title="Guided flow">
              {stageLabel}
            </button>
            <div className="flex rounded border border-academy-border overflow-hidden">
              {(['write', 'read'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1.5 transition-colors ${
                    mode === m
                      ? 'bg-academy-gold text-academy-bg'
                      : 'text-academy-muted hover:text-academy-text'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {(pieceId || text.trim()) && (
              <button onClick={newPiece} className={barBtn}>New</button>
            )}
            <button onClick={() => setShowAbout(v => !v)} className={barBtn} title="What this does">?</button>
            <button
              onClick={invoke}
              disabled={!canSubmit}
              className="bg-academy-gold text-academy-bg font-semibold rounded px-4 py-1.5 text-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {working ? 'Reading…' : marks ? 'Submit next draft' : 'Submit for markup'}
            </button>
          </div>
        </div>

        {showAbout && (
          <p className="px-4 pb-3 text-academy-muted text-[13px] leading-relaxed max-w-3xl">
            Write the argument, then submit it for markup. The Interlocutor returns your draft
            marked up in place: each judgment fastened to the sentence that earned it, coloured by
            how much it costs the argument. Where a fix is better shown than described, it offers a
            rewrite. Accept it and the sentence changes here, in the document; reject it and the
            mark clears. Submit again for the next version.
          </p>
        )}

        {showGuide && (
          <div className="px-4 pb-4 border-t border-academy-border pt-4">
            <StageStepper stage={stage} onChange={changeStage} />
          </div>
        )}
      </header>

      {/* ── Document and margin ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          {past ? (
            <>
              <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-academy-border bg-academy-surface/60">
                <span className="font-mono text-academy-gold text-[10px] uppercase tracking-widest">
                  Draft v{past.version}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-academy-muted">
                  read only
                </span>
                <button onClick={() => setPast(null)} className={`${barBtn} ml-auto`}>
                  Back to your draft
                </button>
              </div>
              <MarkedUpText
                content={past.content}
                annotations={past.annotations}
                activeId={activeId}
                onSpanClick={id => {
                  setActiveId(id);
                  document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />
            </>
          ) : mode === 'write' ? (
            <DraftEditor
              ref={editorRef}
              value={text}
              onChange={handleTextChange}
              spans={spans}
              activeId={activeId}
              onCaretSpan={id => {
                setActiveId(id);
                if (id) {
                  document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }}
              placeholder="Begin."
            />
          ) : (
            <ProsePage text={text} title={title || undefined} />
          )}

          {/* ── The status bar ───────────────────────────────────────────── */}
          <div className="flex-shrink-0 flex items-center gap-4 px-4 py-1.5 border-t border-academy-border bg-academy-bg font-mono text-[10px] uppercase tracking-wider text-academy-muted">
            <span>{words} word{words === 1 ? '' : 's'}</span>
            {marks && <span>draft v{marks.version}</span>}
            {marks && <span>{openMarks.length} open mark{openMarks.length === 1 ? '' : 's'}</span>}
            {submission.length > 0 && submission.length < MIN_CHARS && (
              <span className="text-academy-gold/80">too little to judge</span>
            )}
            {undoable && (
              <button onClick={undo} className="text-academy-gold hover:opacity-80 ml-auto">
                Undo {undoable.label}
              </button>
            )}
          </div>

          {(notice || error) && (
            <div className="flex-shrink-0 px-4 py-2 border-t border-academy-border bg-academy-bg">
              {notice && <p className="text-academy-gold text-xs leading-relaxed">{notice}</p>}
              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>
          )}
        </div>

        {/* Drag to widen the margin. */}
        <div
          onPointerDown={e => {
            e.preventDefault();
            dragRef.current = true;
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
          }}
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize"
          className="hidden lg:flex w-1.5 flex-shrink-0 cursor-col-resize items-stretch bg-academy-border/60 hover:bg-academy-gold/60 transition-colors"
        />

        {/* ── The margin ───────────────────────────────────────────────────── */}
        <aside
          className="hidden lg:flex flex-col flex-shrink-0 border-l border-academy-border bg-academy-bg min-h-0"
          style={{ width: asideW }}
        >
          <div className="flex-shrink-0 flex items-center border-b border-academy-border">
            {(['comments', 'ask', 'works'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPane(p)}
                className={`flex-1 font-mono text-[10px] uppercase tracking-wider py-2.5 transition-colors border-b-2 ${
                  pane === p
                    ? 'text-academy-gold border-academy-gold'
                    : 'text-academy-muted border-transparent hover:text-academy-text'
                }`}
              >
                {p === 'comments' && marks ? `Comments ${openMarks.length}` : p}
              </button>
            ))}
          </div>

          {pane === 'comments' && (
            <>
              {!past && marks && openMarks.length > 0 && (
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-academy-border">
                  <button
                    onClick={acceptAll}
                    disabled={acceptable.length === 0}
                    className="font-mono text-[10px] uppercase tracking-wider bg-academy-gold/90 text-academy-bg rounded px-2.5 py-1 disabled:opacity-30"
                    title="Apply every rewrite on offer"
                  >
                    Accept all {acceptable.length > 0 ? `(${acceptable.length})` : ''}
                  </button>
                  <button onClick={rejectAll} className={barBtn}>Reject all</button>
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-auto p-3">
                {past ? (
                  <CommentList
                    annotations={past.annotations}
                    readOnly
                    activeId={activeId}
                    onCardFocus={focusMark}
                  />
                ) : marks ? (
                  <CommentList
                    annotations={marks.annotations}
                    summary={marks.summary || undefined}
                    onAccept={acceptOne}
                    onDismiss={rejectOne}
                    activeId={activeId}
                    onCardFocus={focusMark}
                  />
                ) : (
                  <p className="font-serif italic text-academy-muted text-sm leading-relaxed">
                    Nothing marked yet. Write the argument, then submit it for markup and the
                    judgments will appear here, fastened to the sentences that earned them.
                  </p>
                )}
              </div>
            </>
          )}

          {pane === 'ask' && (
            <div className="flex-1 min-h-0 overflow-auto p-3">
              {text.trim().length >= MIN_CHARS ? (
                <InterlocutorChat
                  key={marks?.draftId ?? 'no-draft'}
                  excerpt={past?.content ?? text}
                  pieceTitle={title}
                  placeholder="Ask about the draft, or push back on a judgment…"
                />
              ) : (
                <p className="text-academy-muted text-sm leading-relaxed">
                  The conversation is anchored to the draft, so it opens once there is a draft to
                  anchor it to. Write a few sentences.
                </p>
              )}
            </div>
          )}

          {pane === 'works' && (
            <div className="flex-1 min-h-0 overflow-auto p-3">
              <WorksList works={works} activePieceId={pieceId} onOpen={openPiece} />
              {history.length === 0 ? (
                <p className="font-serif italic text-academy-muted text-sm">
                  {works.length === 0
                    ? 'Nothing written yet. Each submission for markup snapshots a version.'
                    : 'This piece has no submitted versions yet.'}
                </p>
              ) : (
                <DraftHistory
                  versions={history}
                  activeDraftId={past?.id ?? marks?.draftId ?? null}
                  onSelect={openPast}
                />
              )}
            </div>
          )}
        </aside>
      </div>

      {/* ── Below lg the margin cannot sit beside the page, so it sits under it ─ */}
      {!past && marks && (
        <div className="lg:hidden flex-shrink-0 max-h-[38vh] overflow-auto border-t border-academy-border p-3">
          {marks.summary && (
            <div className="rounded-lg border border-academy-gold/25 bg-academy-surface/40 p-3 mb-2.5">
              <SummaryLead summary={marks.summary} />
            </div>
          )}
          <CommentList
            annotations={marks.annotations}
            onAccept={acceptOne}
            onDismiss={rejectOne}
            activeId={activeId}
            onCardFocus={focusMark}
          />
        </div>
      )}
    </div>
  );
}
