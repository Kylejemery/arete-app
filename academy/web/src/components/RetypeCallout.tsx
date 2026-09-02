'use client';

// The retype callout: a box under the sentence you are working on, where you
// type the sentence again and watch the page change as you type.
//
// This is the composer's answer to prose that arrived from somewhere else, the
// Interlocutor's rewrite or a draft's first pass, and does not yet sound like
// the writer. Rather than editing a suggestion in a margin card and accepting
// it whole, the writer takes the sentence into the box, types over it in their
// own words, and the page transforms under their hands. Enter keeps it, Escape
// puts the original back, Tab walks to the next sentence, so a whole draft can
// be retyped sentence by sentence without leaving the keyboard.
//
// The box also holds the two things a sentence can be set against: the
// writer's own voice (three variants judged from their earlier prose) and the
// corpus (what the sources say where the sentence stands, quotable or not,
// with a fidelity verdict). Both load into the box, never into the page
// directly; the writer's keystrokes are still what changes the draft.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  formatCitation,
  formatQuotation,
  openingSentence,
  type FidelityAssessment,
  type GroundedPassage,
  type VoiceVariant,
} from '@/lib/composer';

export interface VoiceState {
  busy: boolean;
  variants: VoiceVariant[] | null;
  error: string | null;
}

export interface GroundState {
  busy: boolean;
  passages: GroundedPassage[] | null;
  assessment: FidelityAssessment | null;
  error: string | null;
}

export const IDLE_VOICE: VoiceState = { busy: false, variants: null, error: null };
export const IDLE_GROUND: GroundState = { busy: false, passages: null, assessment: null, error: null };

type Panel = 'none' | 'voice' | 'ground';

const VERDICT: Record<FidelityAssessment['verdict'], { label: string; color: string }> = {
  supported: { label: 'Supported', color: '#6BBF8A' },
  partly: { label: 'Partly', color: '#C9A84C' },
  contradicted: { label: 'Contradicted', color: '#E06B6B' },
  unsupported: { label: 'Corpus silent', color: '#7A8FA6' },
};

const chip =
  'font-mono text-[10px] uppercase tracking-wider rounded px-2 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const chipQuiet = `${chip} text-academy-muted hover:text-academy-gold hover:bg-academy-card`;
const chipOn = `${chip} text-academy-gold bg-academy-gold/15`;

export function RetypeCallout({
  value,
  original,
  index,
  total,
  onChange,
  onCommit,
  onCancel,
  onNext,
  onPrev,
  onCut,
  suggestion,
  suggestionComment,
  voice,
  onVoice,
  ground,
  onGround,
}: {
  value: string;
  original: string;
  index: number;
  total: number;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onNext: () => void;
  onPrev: () => void;
  onCut: () => void;
  /** The Interlocutor's rewrite of this span, if it offered one. */
  suggestion?: string | null;
  suggestionComment?: string | null;
  voice: VoiceState;
  onVoice: () => void;
  ground: GroundState;
  onGround: () => void;
}) {
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const [panel, setPanel] = useState<Panel>('none');
  // Text the writer has selected inside a passage card, for "quote selection".
  const [picked, setPicked] = useState<{ id: string; text: string } | null>(null);

  // A fresh sentence: focus the box with the caret at the end, and fold the
  // panels back down so the callout is a box again, not a dossier.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    setPanel('none');
    setPicked(null);
    // Only when the sentence itself changes, not on every keystroke.
  }, [original]);

  // Results arriving open their own panel.
  useEffect(() => {
    if (voice.variants || voice.error) setPanel('voice');
  }, [voice.variants, voice.error]);
  useEffect(() => {
    if (ground.passages || ground.error) setPanel('ground');
  }, [ground.passages, ground.error]);

  // Grow with the sentence.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) onNext();
      else onCommit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
    }
  };

  const changed = value !== original;
  const dirty = changed ? 'edited' : 'unchanged';

  const insert = (fragment: string) => {
    const base = value.trimEnd();
    onChange(base ? `${base} ${fragment}` : fragment);
    boxRef.current?.focus();
  };

  const verdict = ground.assessment ? VERDICT[ground.assessment.verdict] : null;

  return (
    <div
      className="rounded-lg border border-academy-gold/40 bg-navy shadow-2xl"
      style={{ boxShadow: '0 18px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,168,76,0.12)' }}
      // A button click must not pull focus out of the box. Text elsewhere in
      // the callout (the passages) stays selectable.
      onMouseDown={e => {
        if ((e.target as HTMLElement).closest('button')) e.preventDefault();
      }}
    >
      {/* ── Head ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3.5 pt-2.5 pb-1.5">
        <span className="font-mono text-academy-gold text-[10px] uppercase tracking-widest">Retype</span>
        {total > 0 && (
          <span className="font-mono text-academy-muted text-[10px] uppercase tracking-wider">
            {index} of {total}
          </span>
        )}
        <span className="font-mono text-academy-muted/70 text-[10px] uppercase tracking-wider">{dirty}</span>
        <span className="ml-auto hidden sm:inline font-mono text-academy-muted/70 text-[10px] tracking-wider">
          Enter keeps · Esc restores · Tab next · Shift+Tab back
        </span>
      </div>

      {/* ── The box ────────────────────────────────────────────────────────── */}
      <div className="px-3.5">
        <textarea
          ref={boxRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          spellCheck
          className="block w-full resize-none bg-academy-surface/60 border border-academy-border focus:border-academy-gold/60 rounded-md px-3.5 py-2.5 text-academy-text placeholder-academy-muted/60 focus:outline-none"
          style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: '16.5px',
            lineHeight: '1.75',
            caretColor: '#C9A84C',
            overflow: 'hidden',
          }}
          placeholder="Type the sentence as you would say it."
        />
      </div>

      {/* ── Chips ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 px-3.5 py-2">
        <button
          type="button"
          onClick={() => onChange(original)}
          disabled={!changed}
          className={chipQuiet}
          title="Put the original sentence back in the box (the page follows)"
        >
          Original
        </button>
        {suggestion && (
          <button
            type="button"
            onClick={() => onChange(suggestion)}
            disabled={value === suggestion}
            className={chipQuiet}
            title={suggestionComment ?? 'Load the Interlocutor\'s rewrite into the box'}
          >
            Interlocutor&rsquo;s rewrite
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (voice.variants && !voice.busy) setPanel(p => (p === 'voice' ? 'none' : 'voice'));
            else onVoice();
          }}
          disabled={voice.busy}
          className={panel === 'voice' ? chipOn : chipQuiet}
          title="Three ways to say this sentence in your own voice, judged from your earlier drafts"
        >
          {voice.busy ? 'Listening…' : 'In my voice'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (ground.passages && !ground.busy) setPanel(p => (p === 'ground' ? 'none' : 'ground'));
            else onGround();
          }}
          disabled={ground.busy}
          className={panel === 'ground' ? chipOn : chipQuiet}
          title="What the corpus says where this sentence stands, and whether the sentence is faithful to it"
        >
          {ground.busy ? 'Searching…' : 'Ground in corpus'}
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onCut} className={chipQuiet} title="Delete this sentence and mend the seam">
          Cut
        </button>
        <button type="button" onClick={onCancel} className={chipQuiet} title="Restore the original and close (Esc)">
          Restore
        </button>
        <button
          type="button"
          onClick={onCommit}
          className="font-mono text-[10px] uppercase tracking-wider rounded px-3 py-1 bg-academy-gold text-academy-bg font-semibold hover:opacity-90"
          title="Keep the sentence as it now reads (Enter)"
        >
          Keep
        </button>
      </div>

      {/* ── Voice panel ────────────────────────────────────────────────────── */}
      {panel === 'voice' && (
        <div className="border-t border-academy-border px-3.5 py-3 space-y-2">
          {voice.error && <p className="text-red-400 text-xs">{voice.error}</p>}
          {voice.variants?.length === 0 && (
            <p className="font-serif italic text-academy-muted text-sm">Nothing came back for this sentence.</p>
          )}
          {voice.variants?.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange(v.text);
                boxRef.current?.focus();
              }}
              className="block w-full text-left rounded-md border border-academy-border hover:border-academy-gold/50 bg-academy-surface/40 px-3 py-2 transition-colors"
              title="Load into the box, then type over it"
            >
              <p className="font-serif text-academy-text text-[15px] leading-relaxed">{v.text}</p>
              {v.note && <p className="mt-1 text-academy-muted text-[12px] leading-snug">{v.note}</p>}
            </button>
          ))}
          {voice.variants && (
            <p className="text-academy-muted/80 text-[11.5px] leading-snug pt-1">
              These are starting points. Load one, then say it your way; the page changes as you type.
            </p>
          )}
        </div>
      )}

      {/* ── Ground panel ───────────────────────────────────────────────────── */}
      {panel === 'ground' && (
        <div className="border-t border-academy-border px-3.5 py-3 space-y-2.5">
          {ground.error && <p className="text-red-400 text-xs">{ground.error}</p>}
          {ground.assessment && verdict && (
            <div className="rounded-md border px-3 py-2" style={{ borderColor: `${verdict.color}66`, background: `${verdict.color}12` }}>
              <span className="font-mono text-[10px] uppercase tracking-widest mr-2" style={{ color: verdict.color }}>
                {verdict.label}
              </span>
              <span className="text-academy-text text-[13px] leading-relaxed">{ground.assessment.note}</span>
            </div>
          )}
          {ground.passages?.length === 0 && (
            <p className="font-serif italic text-academy-muted text-sm">
              The corpus has nothing close to this sentence. That is worth knowing: the claim stands on you, not on a source.
            </p>
          )}
          {ground.passages?.map(p => {
            const loc = [p.work, p.section_label].filter(Boolean).join(' ');
            const sel = picked?.id === p.id ? picked.text : null;
            return (
              <div key={p.id} className="rounded-md border border-academy-border bg-academy-surface/40 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="font-serif text-academy-gold text-[13px]">{p.author}</span>
                  <span className="font-serif italic text-academy-muted text-[12.5px]">{loc}</span>
                  {p.translator && (
                    <span className="text-academy-muted/80 text-[11px]">trans. {p.translator}</span>
                  )}
                  <span
                    className="font-mono text-[9px] uppercase tracking-wider border rounded px-1.5 py-0.5"
                    style={{
                      color: p.mode === 'quote' ? '#6BBF8A' : '#7A8FA6',
                      borderColor: p.mode === 'quote' ? '#6BBF8A66' : '#7A8FA666',
                    }}
                    title={
                      p.mode === 'quote'
                        ? 'A primary or public-domain text: quotable verbatim'
                        : 'A summary or synthesis: paraphrase and cite, do not quote'
                    }
                  >
                    {p.mode === 'quote' ? 'quotable' : 'paraphrase only'}
                  </span>
                  <span className="ml-auto font-mono text-[9px] text-academy-muted/60">{p.similarity.toFixed(2)}</span>
                </div>
                <p
                  className="font-serif text-academy-text/90 text-[13.5px] leading-relaxed whitespace-pre-wrap select-text max-h-40 overflow-auto pr-1"
                  onMouseUp={() => {
                    const s = window.getSelection()?.toString().trim() ?? '';
                    setPicked(s.length >= 8 ? { id: p.id, text: s } : null);
                  }}
                >
                  {p.text}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {p.mode === 'quote' && (
                    <button
                      type="button"
                      onClick={() => insert(formatQuotation(p, sel ?? openingSentence(p.text)))}
                      className={chipQuiet}
                      title="Append the quotation, with its citation, to the sentence in the box"
                    >
                      {sel ? 'Quote selection' : 'Quote opening line'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => insert(formatCitation(p))}
                    className={chipQuiet}
                    title="Append only the citation"
                  >
                    Cite
                  </button>
                </div>
              </div>
            );
          })}
          {ground.passages && ground.passages.length > 0 && (
            <p className="text-academy-muted/80 text-[11.5px] leading-snug pt-1">
              Select words inside a passage to quote exactly those. A quotation lands in the box; you shape the sentence around it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
