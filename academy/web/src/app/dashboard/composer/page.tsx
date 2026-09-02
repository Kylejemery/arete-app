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
// Retyping is the third way to work a sentence, and the one built for prose
// that arrived from somewhere else. Ctrl+Enter (or a comment card's "Retype it")
// opens a box under the sentence at the caret; what you type there replaces the
// sentence on the page as you type. Enter keeps it, Escape restores it, Tab
// walks to the next sentence. The box can load the Interlocutor's rewrite, three
// variants in your own voice, or the corpus passages the sentence stands on, but
// only your keystrokes change the draft.
//
// Text stays plain (markdown for headings, emphasis, quotations) because every
// annotation is a character offset into it. The toolbar writes that markdown for
// you, and the read view typesets it. The working copy autosaves to the piece a
// moment after each pause, so a draft is in the database long before its first
// markup, and follows you between machines.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InterlocutorChat, MIN_CRITIQUE_CHARS as MIN_CHARS } from '@/components/InterlocutorPanel';
import { CommentList, MarkedUpText, SummaryLead, type Annotation } from '@/components/MarkedUpDraft';
import { DraftHistory, type DraftSummary } from '@/components/DraftHistory';
import { StageStepper } from '@/components/StageStepper';
import { DraftEditor, type DraftEditorHandle, type PassageSelection } from '@/components/DraftEditor';
import { ProsePage } from '@/components/ProsePage';
import { PassageBar } from '@/components/PassageBar';
import { VoiceMeter } from '@/components/VoiceMeter';
import { WorksList, type WorkSummary } from '@/components/WorksList';
import {
  IDLE_GROUND,
  IDLE_VOICE,
  RetypeCallout,
  type GroundState,
  type VoiceState,
} from '@/components/RetypeCallout';
import { metricSpans, type MetricKind } from '@/lib/scribe/voice-metrics';
import {
  acceptAllRewrites,
  acceptRewrite,
  diffRegion,
  reanchor,
  reanchorByQuote,
  type SpanInput,
} from '@/lib/annotations';
import { DEFAULT_STAGE, isStage, STAGES, type Stage } from '@/lib/interlocutor';
import { sentenceAfter, sentenceAt, sentenceBefore, sentenceIndex } from '@/lib/sentences';
import type { FidelityAssessment, GroundedPassage, VoiceVariant } from '@/lib/composer';

const DRAFT_KEY = 'interlocutor-draft';
const TITLE_KEY = 'interlocutor-draft-title';
const PIECE_KEY = 'interlocutor-piece-id';
const ASIDE_KEY = 'interlocutor-aside-w';

// Autosave: a pause this long after the last keystroke writes the working copy.
const SAVE_DELAY = 1500;
// A scratch draft becomes a piece in the database once it is this long.
const NEW_PIECE_MIN = 200;
// Selections shorter than this are a caret, and retype the sentence around it.
const MIN_RETYPE_SELECTION = 4;

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

// The sentence under the callout. `value` is what the box holds, and what the
// page currently shows in place of `original`; the range on the page is
// [start, start + value.length).
interface Retype {
  start: number;
  original: string;
  value: string;
  // The Interlocutor's mark this retype answers, if any: kept as accepted when
  // the retyped sentence differs from the original.
  annId: string | null;
  suggestion: string | null;
  suggestionComment: string | null;
}

type Pane = 'comments' | 'ask' | 'works';
type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface LocalCopy {
  text: string;
  at: number;
}

const readLocal = (pid: string | null): LocalCopy | null => {
  try {
    const text = localStorage.getItem(draftKey(pid));
    if (text === null) return null;
    const at = Number(localStorage.getItem(`${draftKey(pid)}:at`)) || 0;
    return { text, at };
  } catch {
    return null;
  }
};

// The newer of the browser's copy and the database's. A copy with no timestamp
// (written by an earlier composer) counts as older than any saved one.
const chooseCopy = (local: LocalCopy | null, dbText: string | null, dbAt: string | null): string | null => {
  const dbMs = dbAt ? Date.parse(dbAt) : 0;
  if (dbText !== null && (!local || dbMs > local.at)) return dbText;
  return local?.text ?? dbText;
};

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

  // The voice meter's current category, painted in the document; and the
  // passage the writer has selected, which the margin can be asked about.
  const [meter, setMeter] = useState<MetricKind | null>(null);
  const [passage, setPassage] = useState<PassageSelection | null>(null);
  const [seed, setSeed] = useState<{ text: string; nonce: number } | null>(null);

  // The retype callout and what it has fetched for the current sentence.
  const [retype, setRetype] = useState<Retype | null>(null);
  const [voice, setVoice] = useState<VoiceState>(IDLE_VOICE);
  const [ground, setGround] = useState<GroundState>(IDLE_GROUND);

  // Autosave.
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const lastSaved = useRef<{ pieceId: string | null; text: string; title: string }>({
    pieceId: null,
    text: '',
    title: '',
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fresh values for the save timer, which fires outside any render.
  const live = useRef({ text, title, stage, pieceId, userId });
  live.current = { text, title, stage, pieceId, userId };

  // Stable identity: DraftEditor calls this from a layout effect.
  const onSelection = useCallback((s: PassageSelection | null) => setPassage(s), []);

  const askAboutPassage = (question: string) => {
    setSeed({ text: question, nonce: Date.now() });
    setPane('ask');
    setPassage(null);
  };

  // Meter ranges as editor spans, so the existing backdrop paints them.
  const meterSpans = useMemo(
    () =>
      meter
        ? metricSpans(text, meter).map((s, i) => ({
            id: `meter-${i}`,
            start: s.start,
            end: s.end,
            severity: 'meter',
          }))
        : [],
    [meter, text]
  );

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
      .select('id, title, stage, updated_at, working_copy')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false });
    const rows =
      (pieces as { id: string; title: string; stage: string; updated_at: string; working_copy: string | null }[]) ?? [];
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
        // The working copy is the truer word count for a piece being written.
        words: r.working_copy?.trim() ? r.working_copy.trim().split(/\s+/).length : latest[r.id]?.words ?? 0,
      }))
    );
  }, []);

  const persistText = (v: string, pid: string | null = pieceId) => {
    try {
      localStorage.setItem(draftKey(pid), v);
      localStorage.setItem(`${draftKey(pid)}:at`, String(Date.now()));
    } catch {}
  };

  // ── Auth, restore ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      if (cancelled) return;
      setUserId(user.id);
      let pid: string | null = null;
      let local: LocalCopy | null = null;
      try {
        pid = localStorage.getItem(PIECE_KEY);
        // The per-piece working copy, falling back to the single draft older
        // versions of the composer kept.
        local = readLocal(pid) ?? readLocal(null);
        setTitle(localStorage.getItem(TITLE_KEY) ?? '');
        const w = Number(localStorage.getItem(ASIDE_KEY));
        if (!Number.isNaN(w) && w >= 260) setAsideW(w);
      } catch {}
      let content = local?.text ?? '';
      if (pid) {
        setPieceId(pid);
        const { data: piece } = await supabase
          .from('writing_pieces')
          .select('title, stage, working_copy, working_copy_saved_at')
          .eq('id', pid)
          .maybeSingle();
        const row = piece as {
          title?: string;
          stage?: string;
          working_copy?: string | null;
          working_copy_saved_at?: string | null;
        } | null;
        if (isStage(row?.stage)) setStage(row.stage);
        if (row?.title) setTitle(row.title);
        content = chooseCopy(local, row?.working_copy ?? null, row?.working_copy_saved_at ?? null) ?? '';
        await loadHistory(pid);
      }
      setText(content);
      lastSaved.current = { pieceId: pid, text: content, title: localStorage.getItem(TITLE_KEY) ?? '' };
      await loadWorks(user.id);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [router, loadHistory, loadWorks]);

  // ── Autosave ────────────────────────────────────────────────────────────────
  // The working copy goes to the piece row after a pause. A scratch draft with
  // no piece yet gets one once it is long enough to be worth keeping.
  const saveNow = useCallback(async () => {
    const { text, title, stage, pieceId, userId } = live.current;
    if (!userId) return;
    const last = lastSaved.current;
    if (last.pieceId === pieceId && last.text === text && last.title === title) {
      setSaveState(s => (s === 'pending' ? 'saved' : s));
      return;
    }
    const now = new Date();
    if (!pieceId) {
      if (text.trim().length < NEW_PIECE_MIN) return;
      setSaveState('saving');
      const { data, error: insErr } = await supabase
        .from('writing_pieces')
        .insert({
          user_id: userId,
          title: title.trim() || null,
          stage,
          working_copy: text,
          working_copy_saved_at: now.toISOString(),
        })
        .select('id')
        .single();
      if (insErr || !data) {
        setSaveState('error');
        return;
      }
      const id = (data as { id: string }).id;
      // The piece may have changed under us while the insert was in flight.
      if (live.current.pieceId) return;
      setPieceId(id);
      try { localStorage.setItem(PIECE_KEY, id); } catch {}
      persistText(text, id);
      lastSaved.current = { pieceId: id, text, title };
      setSavedAt(now);
      setSaveState('saved');
      void loadWorks(userId);
      return;
    }
    setSaveState('saving');
    const { error: upErr } = await supabase
      .from('writing_pieces')
      .update({
        working_copy: text,
        working_copy_saved_at: now.toISOString(),
        title: title.trim() || null,
        updated_at: now.toISOString(),
      })
      .eq('id', pieceId);
    if (upErr) {
      setSaveState('error');
      return;
    }
    lastSaved.current = { pieceId, text, title };
    setSavedAt(now);
    setSaveState('saved');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadWorks]);

  useEffect(() => {
    if (!loaded) return;
    const last = lastSaved.current;
    if (last.pieceId === pieceId && last.text === text && last.title === title) return;
    setSaveState('pending');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveNow(); }, SAVE_DELAY);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [text, title, pieceId, loaded, saveNow]);

  // Every keystroke re-bases the marks so a comment keeps pointing at the words
  // it was written about while the draft moves under it.
  const handleTextChange = (next: string) => {
    const region = diffRegion(text, next);
    setText(next);
    persistText(next);
    if (region) {
      setMarks(prev =>
        prev ? { ...prev, annotations: prev.annotations.map(a => reanchor(a, region, next)) } : prev
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
    if (retype) commitRetype();
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
    setUndoable({ text, annotations: marks?.annotations ?? [], label });
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
    if (!undoable) return;
    const before = undoable;
    const byId = new Map(before.annotations.map(a => [a.id, a.status]));
    const reopened = (marks?.annotations ?? [])
      .filter(a => byId.get(a.id) === 'open' && a.status !== 'open')
      .map(a => a.id);
    setRetype(null);
    setText(before.text);
    persistText(before.text);
    setMarks(prev => (prev ? { ...prev, annotations: before.annotations } : prev));
    setUndoable(null);
    setNotice(null);
    if (reopened.length) {
      void supabase.from('draft_annotations').update({ status: 'open' }).in('id', reopened);
    }
  };

  // ── Retyping ────────────────────────────────────────────────────────────────
  // Open the box under a range. A caret (or a selection too short to mean
  // anything) opens the sentence around it; a real selection opens exactly
  // itself. A mark with a rewrite inside the range rides along as the
  // "Interlocutor's rewrite" chip, and is kept as accepted if the sentence
  // changes.
  const openRetype = (
    range: { start: number; end: number },
    opts: { value?: string; annId?: string; exact?: boolean } = {}
  ) => {
    let start = range.start;
    let end = range.end;
    if (!opts.exact && end - start < MIN_RETYPE_SELECTION) {
      const s = sentenceAt(text, start);
      if (!s) {
        setNotice('Nothing to retype yet. Write a sentence first.');
        return;
      }
      start = s.start;
      end = s.end;
    }
    if (end <= start) return;
    const original = text.slice(start, end);

    // A rewrite the Interlocutor offered for a span inside this one.
    let annId = opts.annId ?? null;
    let suggestion: string | null = null;
    let suggestionComment: string | null = null;
    const mark = annId
      ? openMarks.find(a => a.id === annId)
      : openMarks.find(
          a =>
            a.suggestion &&
            a.start_offset !== null &&
            a.end_offset !== null &&
            a.start_offset >= start &&
            a.end_offset <= end
        );
    if (mark && mark.suggestion && mark.start_offset !== null && mark.end_offset !== null) {
      annId = mark.id;
      suggestion =
        original.slice(0, mark.start_offset - start) +
        mark.suggestion +
        original.slice(mark.end_offset - start);
      suggestionComment = mark.comment;
    }

    snapshot('retype');
    const value = opts.value ?? original;
    if (value !== original) {
      handleTextChange(text.slice(0, start) + value + text.slice(end));
    }
    setRetype({ start, original, value, annId, suggestion, suggestionComment });
    setVoice(IDLE_VOICE);
    setGround(IDLE_GROUND);
    setPassage(null);
    setActiveId(annId);
    setNotice(null);
  };

  // The box changed: the page follows, keystroke for keystroke.
  const retypeChange = (v: string) => {
    if (!retype) return;
    const end = retype.start + retype.value.length;
    handleTextChange(text.slice(0, retype.start) + v + text.slice(end));
    setRetype({ ...retype, value: v });
  };

  // Keep what the box holds. Returns where the sentence now ends, for walking.
  const commitRetype = (): { text: string; start: number; end: number } | null => {
    if (!retype) return null;
    const r = retype;
    const end = r.start + r.value.length;
    if (r.annId && r.value !== r.original) {
      setMarks(prev =>
        prev
          ? {
              ...prev,
              annotations: prev.annotations.map(a =>
                a.id === r.annId ? { ...a, status: 'accepted', start_offset: null, end_offset: null } : a
              ),
            }
          : prev
      );
      void persistStatus([r.annId], 'accepted');
    }
    setRetype(null);
    setVoice(IDLE_VOICE);
    setGround(IDLE_GROUND);
    setActiveId(null);
    return { text, start: r.start, end };
  };

  const keepRetype = () => {
    const c = commitRetype();
    if (!c) return;
    requestAnimationFrame(() => editorRef.current?.focusRange(c.end, c.end));
  };

  // Put the original back and close.
  const cancelRetype = () => {
    if (!retype) return;
    const end = retype.start + retype.value.length;
    if (retype.value !== retype.original) {
      handleTextChange(text.slice(0, retype.start) + retype.original + text.slice(end));
    }
    const at = retype.start + retype.original.length;
    setRetype(null);
    setVoice(IDLE_VOICE);
    setGround(IDLE_GROUND);
    setUndoable(null);
    requestAnimationFrame(() => editorRef.current?.focusRange(at, at));
  };

  const nextRetype = () => {
    const c = commitRetype();
    if (!c) return;
    const n = sentenceAfter(c.text, c.end);
    if (n) openRetype(n);
    else {
      setNotice('That was the last sentence.');
      requestAnimationFrame(() => editorRef.current?.focusRange(c.end, c.end));
    }
  };

  const prevRetype = () => {
    const c = commitRetype();
    if (!c) return;
    const p = sentenceBefore(c.text, c.start);
    if (p) openRetype(p);
    else {
      setNotice('That was the first sentence.');
      requestAnimationFrame(() => editorRef.current?.focusRange(c.start, c.start));
    }
  };

  // Delete the sentence and mend the seam.
  const cutRetype = () => {
    if (!retype) return;
    const r = retype;
    const end = r.start + r.value.length;
    const head = text.slice(0, r.start);
    let tail = text.slice(end);
    if (/\s$/.test(head) || head === '') tail = tail.replace(/^[ \t]+/, '');
    handleTextChange(head + tail);
    if (r.annId) {
      setMarks(prev =>
        prev
          ? { ...prev, annotations: prev.annotations.map(a => (a.id === r.annId ? { ...a, status: 'dismissed' } : a)) }
          : prev
      );
      void persistStatus([r.annId], 'dismissed');
    }
    setRetype(null);
    setVoice(IDLE_VOICE);
    setGround(IDLE_GROUND);
    setActiveId(null);
    requestAnimationFrame(() => editorRef.current?.focusRange(r.start, r.start));
  };

  // Three ways to say it in the writer's own voice.
  const askVoice = async () => {
    if (!retype) return;
    const r = retype;
    setVoice({ busy: true, variants: null, error: null });
    const end = r.start + r.value.length;
    try {
      const res = await fetch('/api/composer/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: r.original,
          attempt: r.value !== r.original ? r.value : undefined,
          before: text.slice(Math.max(0, r.start - 600), r.start),
          after: text.slice(end, end + 600),
          title: title.trim() || undefined,
          draft: text.slice(0, 12000),
        }),
      });
      const data = (await res.json()) as { variants?: VoiceVariant[]; error?: string };
      if (!res.ok) {
        setVoice({ busy: false, variants: null, error: data.error ?? 'The voice pass is unavailable.' });
        return;
      }
      setVoice({ busy: false, variants: data.variants ?? [], error: null });
    } catch {
      setVoice({ busy: false, variants: null, error: 'The voice pass could not be reached.' });
    }
  };

  // What the corpus says where this sentence stands.
  const askGround = async () => {
    if (!retype) return;
    const r = retype;
    setGround({ busy: true, passages: null, assessment: null, error: null });
    const end = r.start + r.value.length;
    try {
      const res = await fetch('/api/composer/ground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passage: r.value.trim() || r.original,
          context: text.slice(Math.max(0, r.start - 500), Math.min(text.length, end + 500)),
          assess: true,
        }),
      });
      const data = (await res.json()) as {
        passages?: GroundedPassage[];
        assessment?: FidelityAssessment | null;
        error?: string;
      };
      if (!res.ok) {
        setGround({ busy: false, passages: null, assessment: null, error: data.error ?? 'The corpus is unavailable.' });
        return;
      }
      setGround({ busy: false, passages: data.passages ?? [], assessment: data.assessment ?? null, error: null });
    } catch {
      setGround({ busy: false, passages: null, assessment: null, error: 'The corpus could not be reached.' });
    }
  };

  // "Retype it" on a comment card: the rewrite lands on the page and in the
  // box, to be typed over before it is kept.
  const editOne = (a: Annotation) => {
    if (a.start_offset === null || a.end_offset === null || !a.suggestion) return;
    setMode('write');
    setPast(null);
    openRetype({ start: a.start_offset, end: a.end_offset }, { value: a.suggestion, annId: a.id, exact: true });
  };

  const retypeIndex = useMemo(
    () => (retype ? sentenceIndex(text, { start: retype.start, end: retype.start + retype.value.length }) : null),
    [retype, text]
  );

  // ── Past versions, read-only ────────────────────────────────────────────────
  const openPast = async (draftId: string) => {
    setError(null);
    if (retype) commitRetype();
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
  // The newer of the piece's working copies (browser or database) if there is
  // one, otherwise its latest draft. The marks come from that draft, so they
  // are re-anchored by quote whenever the working copy has drifted from the
  // text they were written against.
  const openPiece = async (id: string) => {
    if (id === pieceId) return;
    setError(null);
    setNotice(null);
    if (retype) commitRetype();
    await saveNow();
    persistText(text);

    const { data: piece } = await supabase
      .from('writing_pieces')
      .select('id, title, stage, working_copy, working_copy_saved_at')
      .eq('id', id)
      .maybeSingle();
    if (!piece) { setError('That work could not be opened.'); return; }
    const p = piece as {
      id: string;
      title: string | null;
      stage: string | null;
      working_copy: string | null;
      working_copy_saved_at: string | null;
    };

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

    const content = chooseCopy(readLocal(id), p.working_copy, p.working_copy_saved_at) ?? d?.content ?? '';

    setPieceId(id);
    try { localStorage.setItem(PIECE_KEY, id); } catch {}
    handleTitleChange(p.title ?? '');
    setStage(isStage(p.stage) ? p.stage : DEFAULT_STAGE);
    setText(content);
    persistText(content, id);
    lastSaved.current = { pieceId: id, text: content, title: p.title ?? '' };
    setSaveState('idle');
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
  const newPiece = async () => {
    if (retype) commitRetype();
    await saveNow();
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
    lastSaved.current = { pieceId: null, text: '', title: '' };
    setSaveState('idle');
    try { localStorage.removeItem(PIECE_KEY); } catch {}
    setNotice('New piece. Your other work is under Works, in the margin.');
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

  const saveLabel =
    saveState === 'saving'
      ? 'saving…'
      : saveState === 'pending'
        ? 'unsaved'
        : saveState === 'error'
          ? 'not saved'
          : saveState === 'saved' && savedAt
            ? `saved ${savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : pieceId
              ? 'saved'
              : text.trim()
                ? 'scratch'
                : '';

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
                  onClick={() => {
                    if (m === 'read' && retype) commitRetype();
                    setMode(m);
                  }}
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
          <div className="px-4 pb-3 text-academy-muted text-[13px] leading-relaxed max-w-3xl space-y-2">
            <p>
              Write the argument, then submit it for markup. The Interlocutor returns your draft
              marked up in place: each judgment fastened to the sentence that earned it, coloured by
              how much it costs the argument. Where a fix is better shown than described, it offers a
              rewrite. Accept it and the sentence changes here, in the document; reject it and the
              mark clears. Submit again for the next version.
            </p>
            <p>
              To make a sentence yours, retype it. Put the caret in it and press Ctrl+Enter (or
              press <span className="text-academy-text">Retype it</span> on a comment): a box opens
              under the sentence, and what you type there replaces it on the page as you type. Enter
              keeps it, Escape restores it, Tab moves to the next sentence. The box can load the
              Interlocutor&rsquo;s rewrite, three ways of saying it in your own voice, or the corpus
              passages the sentence stands on, with a verdict on whether it is faithful to them.
              The draft autosaves as you go.
            </p>
          </div>
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
              highlights={meterSpans}
              onSelection={onSelection}
              activeId={activeId}
              onCaretSpan={id => {
                setActiveId(id);
                if (id) {
                  document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }}
              placeholder="Begin."
              retype={retype ? { start: retype.start, end: retype.start + retype.value.length } : null}
              onRetypeRequest={range => openRetype(range)}
              onEditorFocus={() => {
                if (retype) commitRetype();
              }}
              renderRetype={() =>
                retype ? (
                  <RetypeCallout
                    value={retype.value}
                    original={retype.original}
                    index={retypeIndex?.index ?? 0}
                    total={retypeIndex?.total ?? 0}
                    onChange={retypeChange}
                    onCommit={keepRetype}
                    onCancel={cancelRetype}
                    onNext={nextRetype}
                    onPrev={prevRetype}
                    onCut={cutRetype}
                    suggestion={retype.suggestion}
                    suggestionComment={retype.suggestionComment}
                    voice={voice}
                    onVoice={askVoice}
                    ground={ground}
                    onGround={askGround}
                  />
                ) : null
              }
            />
          ) : (
            <ProsePage text={text} title={title || undefined} highlight={meter} />
          )}

          {mode === 'write' && !past && !retype && passage && (
            <PassageBar
              rect={passage.rect}
              passage={passage.text}
              onAsk={askAboutPassage}
              onRetype={() => openRetype({ start: passage.start, end: passage.end }, { exact: true })}
            />
          )}

          {/* ── The status bar ───────────────────────────────────────────── */}
          <div className="flex-shrink-0 flex items-center gap-4 px-4 py-1.5 border-t border-academy-border bg-academy-bg font-mono text-[10px] uppercase tracking-wider text-academy-muted">
            <span>{words} word{words === 1 ? '' : 's'}</span>
            {marks && <span>draft v{marks.version}</span>}
            {marks && <span>{openMarks.length} open mark{openMarks.length === 1 ? '' : 's'}</span>}
            {!past && (
              <VoiceMeter
                text={text}
                active={meter}
                onToggle={m => setMeter(cur => (cur === m ? null : m))}
              />
            )}
            {submission.length > 0 && submission.length < MIN_CHARS && (
              <span className="text-academy-gold/80">too little to judge</span>
            )}
            <span className="flex-1" />
            {mode === 'write' && !past && !retype && text.trim() && (
              <span className="hidden md:inline text-academy-muted/60 normal-case tracking-normal">
                Ctrl+Enter retypes the sentence at the caret
              </span>
            )}
            {saveLabel && (
              <span
                className={saveState === 'error' ? 'text-red-400' : 'text-academy-muted/80'}
                title={
                  pieceId
                    ? 'The working copy autosaves to this piece a moment after you pause.'
                    : 'A scratch draft lives in this browser until it is long enough to keep.'
                }
              >
                {saveLabel}
              </span>
            )}
            {undoable && (
              <button onClick={undo} className="text-academy-gold hover:opacity-80">
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
                    onEdit={editOne}
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
                  seed={seed ?? undefined}
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
            onEdit={editOne}
            onDismiss={rejectOne}
            activeId={activeId}
            onCardFocus={focusMark}
          />
        </div>
      )}
    </div>
  );
}
