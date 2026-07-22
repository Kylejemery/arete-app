'use client';

// The composer — the Interlocutor's only surface. A long-form editor and one
// explicit invocation. No ambient flagging, no inline suggestions, no
// autocomplete: the agent speaks when asked and not otherwise.
//
// Paste and drop are blocked in the editor. The agent never writes the
// student's sentences, so the student never pastes them back in; revisions are
// typed. That is the mechanism, not a formality.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  CritiqueBody,
  DimensionChips,
  InterlocutorChat,
  MIN_CRITIQUE_CHARS as MIN_CHARS,
  type CritiqueResult,
} from '@/components/InterlocutorPanel';

type Mode = 'full' | 'structural';

const DRAFT_KEY = 'interlocutor-draft';
const TITLE_KEY = 'interlocutor-draft-title';

export default function ComposerPage() {
  const router = useRouter();
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [mode, setMode] = useState<Mode>('full');

  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<CritiqueResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ── Auth + draft restore ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      if (cancelled) return;
      try {
        setText(localStorage.getItem(DRAFT_KEY) ?? '');
        setTitle(localStorage.getItem(TITLE_KEY) ?? '');
      } catch {}
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [router]);

  const handleTextChange = (v: string) => {
    setText(v);
    try { localStorage.setItem(DRAFT_KEY, v); } catch {}
  };
  const handleTitleChange = (v: string) => {
    setTitle(v);
    try { localStorage.setItem(TITLE_KEY, v); } catch {}
  };

  const trackSelection = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    setSelection({ start: el.selectionStart, end: el.selectionEnd });
  }, []);

  const blockInsertion = (e: React.ClipboardEvent | React.DragEvent) => {
    e.preventDefault();
    setNotice('Revisions are typed here, not pasted. Type the sentence and you will own it.');
    window.setTimeout(() => setNotice(null), 4000);
  };

  const selected = text.slice(selection.start, selection.end).trim();
  const hasSelection = selected.length >= MIN_CHARS;
  const submission = hasSelection ? selected : text.trim();
  const canSubmit = submission.length >= MIN_CHARS && !working;

  const words = useMemo(
    () => (text.trim() ? text.trim().split(/\s+/).length : 0),
    [text]
  );

  const invoke = async () => {
    if (!canSubmit) return;
    setWorking(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/interlocutor/critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excerpt: submission,
          scope: hasSelection ? 'selection' : 'document',
          documentContext: hasSelection ? text : undefined,
          pieceTitle: title.trim() || undefined,
          mode,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg = (data as { error?: string }).error;
        setError(msg ?? 'The Interlocutor is unavailable.');
        return;
      }
      const d = data as CritiqueResult;
      setResult(d);
      if (!d.recorded) {
        setNotice('This critique was not written to your history, so it will not shape your profile.');
      }
    } catch {
      setError('The Interlocutor could not be reached.');
    } finally {
      setWorking(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-academy-muted italic text-sm">Opening the composer…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <p className="font-mono text-academy-gold text-xs uppercase tracking-[0.3em] mb-2">
          The Interlocutor
        </p>
        <p className="text-academy-muted text-sm leading-relaxed">
          Write the argument. Select a passage and ask, or ask on the whole draft.
          The Interlocutor will not write a sentence for you.
        </p>
      </header>

      {/* ── The editor ──────────────────────────────────────────────────────── */}
      <input
        className="w-full bg-transparent border-b border-academy-border focus:border-academy-gold focus:outline-none font-serif text-academy-text text-2xl pb-2 mb-6 placeholder-academy-muted"
        placeholder="Untitled"
        value={title}
        onChange={e => handleTitleChange(e.target.value)}
        onPaste={blockInsertion}
        onDrop={blockInsertion}
      />

      <textarea
        ref={editorRef}
        className="w-full min-h-[55vh] bg-navy border border-academy-border rounded-lg px-5 py-4 font-serif text-academy-text text-[15px] leading-[1.8] placeholder-academy-muted focus:border-academy-gold focus:outline-none resize-y"
        placeholder="Begin."
        value={text}
        onChange={e => handleTextChange(e.target.value)}
        onPaste={blockInsertion}
        onDrop={blockInsertion}
        onSelect={trackSelection}
        onKeyUp={trackSelection}
        onMouseUp={trackSelection}
      />

      <div className="flex items-center justify-between mt-2 text-xs text-academy-muted font-mono">
        <span>{words} word{words === 1 ? '' : 's'}</span>
        <span>
          {hasSelection
            ? `${selected.split(/\s+/).length} words selected`
            : selection.end > selection.start
              ? 'selection too short to judge'
              : 'no selection'}
        </span>
      </div>

      {notice && (
        <p className="text-academy-gold text-xs mt-3 leading-relaxed">{notice}</p>
      )}

      {/* ── Invocation ──────────────────────────────────────────────────────── */}
      <div className="mt-8 border-t border-academy-gold/20 pt-6 flex flex-wrap items-center gap-4">
        <button
          onClick={invoke}
          disabled={!canSubmit}
          className="bg-academy-gold text-academy-bg font-semibold rounded-lg px-6 py-3 text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {working
            ? 'Reading…'
            : hasSelection
              ? 'Submit the selection'
              : 'Submit the draft'}
        </button>

        <div className="flex items-center gap-1 text-xs font-mono">
          {(['full', 'structural'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded border transition-colors ${
                mode === m
                  ? 'border-academy-gold text-academy-gold'
                  : 'border-academy-border text-academy-muted hover:text-academy-text'
              }`}
            >
              {m === 'full' ? 'Full critique' : 'Structural pass'}
            </button>
          ))}
        </div>

        {submission.length > 0 && submission.length < MIN_CHARS && (
          <span className="text-academy-muted text-xs">
            Too little to judge.
          </span>
        )}
      </div>

      {error && <p className="text-red-400 text-xs mt-4">{error}</p>}

      {/* ── The critique ────────────────────────────────────────────────────── */}
      {result && (
        <section className="mt-12 border-l-2 border-academy-gold pl-6">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <p className="font-mono text-academy-gold text-xs uppercase tracking-widest mr-2">
              The Interlocutor
            </p>
            <DimensionChips dimensions={result.dimensions_flagged} />
          </div>
          <CritiqueBody critique={result.critique} />
        </section>
      )}

      {/* ── Conversation ────────────────────────────────────────────────────────
          Available with or without a critique: a question about a paragraph you
          are stuck on should not require submitting the whole draft first. It
          stays anchored to the draft either way, and inherits the critique as
          context once one exists. */}
      {text.trim().length >= MIN_CHARS && (
        <section className="mt-12 border-t border-academy-gold/20 pt-6">
          <p className="font-mono text-academy-gold text-xs uppercase tracking-widest mb-4">
            {result ? 'Continue' : 'Ask'}
          </p>
          <InterlocutorChat
            key={result?.id ?? 'no-critique'}
            excerpt={hasSelection ? selected : text}
            critique={result?.critique}
            critiqueId={result?.id}
            pieceTitle={title}
            placeholder={
              result
                ? 'Push back, or ask what a judgment meant…'
                : 'Ask about the draft. It will not write a sentence for you…'
            }
          />
        </section>
      )}
    </div>
  );
}
