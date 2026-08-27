'use client';

// The writing surface. A page you type on, with the Interlocutor's marks showing
// under your words: the draft is a plain textarea (so every character offset the
// markup depends on stays exact) laid over a backdrop that renders the same text
// with the marked sentences coloured. The two share one font, one set of metrics,
// and one box, so the colour sits behind the right words.
//
// The textarea grows with the document and the page around it scrolls, which is
// why there is no scroll syncing to go wrong: there is only one scroller.
//
// A caret placed inside a marked sentence reports that annotation upward, so the
// margin comment lights up as you move through the draft, and focusRange lets a
// comment pull the caret back to its sentence.

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type CSSProperties,
} from 'react';
import { buildSegments, type SpanInput } from '@/lib/annotations';

export interface DraftEditorHandle {
  focusRange: (start: number, end: number) => void;
  focus: () => void;
}

// Metrics shared by the textarea and the backdrop. Anything that affects where a
// character lands has to live here, on both, or the colour drifts off the words.
const METRICS: CSSProperties = {
  fontSize: '17px',
  lineHeight: '1.9',
  padding: '3rem 3.25rem 6rem',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
  wordBreak: 'normal',
  letterSpacing: 'normal',
  tabSize: 4,
  border: 0,
  margin: 0,
  fontFamily: 'var(--font-playfair), Georgia, serif',
};

const SEV_COLOR: Record<string, string> = {
  critical: '#E06B6B',
  major: '#C9A84C',
  minor: '#6B9BD1',
  note: '#7A8FA6',
  strength: '#6BBF8A',
};

// ── The formatting bar ───────────────────────────────────────────────────────
// Markdown under the hood, buttons on top: the student marks a heading or an
// emphasis the way they would in a word processor and never types a hash.

type Wrap = { kind: 'wrap'; before: string; after: string };
type Prefix = { kind: 'prefix'; token: string };
type Action = Wrap | Prefix;

const TOOLS: { label: string; title: string; action: Action; className?: string }[] = [
  { label: 'B', title: 'Bold (Ctrl+B)', action: { kind: 'wrap', before: '**', after: '**' }, className: 'font-bold' },
  { label: 'I', title: 'Italic (Ctrl+I)', action: { kind: 'wrap', before: '*', after: '*' }, className: 'italic' },
  { label: 'H1', title: 'Title', action: { kind: 'prefix', token: '# ' } },
  { label: 'H2', title: 'Section heading', action: { kind: 'prefix', token: '## ' } },
  { label: 'H3', title: 'Subheading', action: { kind: 'prefix', token: '### ' } },
  { label: '❝', title: 'Block quotation', action: { kind: 'prefix', token: '> ' } },
  { label: '•', title: 'Bulleted list', action: { kind: 'prefix', token: '* ' } },
  { label: '1.', title: 'Numbered list', action: { kind: 'prefix', token: '1. ' } },
];

export const DraftEditor = forwardRef<
  DraftEditorHandle,
  {
    value: string;
    onChange: (v: string) => void;
    spans: SpanInput[];
    activeId?: string | null;
    onCaretSpan?: (id: string | null) => void;
    placeholder?: string;
    showToolbar?: boolean;
  }
>(function DraftEditor(
  { value, onChange, spans, activeId = null, onCaretSpan, placeholder, showToolbar = true },
  ref
) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Grow the textarea to fit its content so the page, not the box, scrolls.
  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  useImperativeHandle(ref, () => ({
    focus: () => taRef.current?.focus(),
    focusRange: (start: number, end: number) => {
      const el = taRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, Math.max(start, end));
      // The backdrop holds a positioned element per marked span, so scrolling to
      // the mark scrolls to the sentence.
      const mark = scrollRef.current?.querySelector('[data-caret-anchor="1"]');
      if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  }));

  const reportCaret = useCallback(() => {
    if (!onCaretSpan) return;
    const el = taRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    const hit = spans.find(s => pos >= s.start && pos < s.end);
    onCaretSpan(hit?.id ?? null);
  }, [onCaretSpan, spans]);

  // ── Formatting ─────────────────────────────────────────────────────────────
  const apply = useCallback(
    (action: Action) => {
      const el = taRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;

      if (action.kind === 'wrap') {
        const sel = value.slice(start, end);
        const next =
          value.slice(0, start) + action.before + sel + action.after + value.slice(end);
        onChange(next);
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(start + action.before.length, end + action.before.length);
        });
        return;
      }

      // Line prefix: applied to every line the selection touches, and toggled off
      // when the line already carries it.
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEndRaw = value.indexOf('\n', end);
      const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
      const block = value.slice(lineStart, lineEnd);
      const stripped = block
        .split('\n')
        .map(l => l.replace(/^(#{1,6}\s+|>\s?|[*•-]\s+|\d+[.)]\s+)/, ''));
      const already = block
        .split('\n')
        .every(l => l.startsWith(action.token));
      const rebuilt = stripped.map(l => (already ? l : action.token + l)).join('\n');
      const next = value.slice(0, lineStart) + rebuilt + value.slice(lineEnd);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        // The caret has to travel with the token that was just put in front of
        // (or taken off) its line, or a second click lands on the line above.
        const firstDelta = rebuilt.split('\n')[0].length - block.split('\n')[0].length;
        const total = rebuilt.length - block.length;
        const from = Math.max(lineStart, start + firstDelta);
        el.setSelectionRange(from, Math.max(from, end + total));
      });
    },
    [value, onChange]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b') {
      e.preventDefault();
      apply({ kind: 'wrap', before: '**', after: '**' });
    } else if (k === 'i') {
      e.preventDefault();
      apply({ kind: 'wrap', before: '*', after: '*' });
    }
  };

  const segments = buildSegments(value, spans);

  return (
    <div className="flex flex-col h-full min-h-0">
      {showToolbar && (
        <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-academy-border bg-academy-surface/60">
          {TOOLS.map(t => (
            <button
              key={t.label}
              type="button"
              title={t.title}
              onMouseDown={e => e.preventDefault()}
              onClick={() => apply(t.action)}
              className={`min-w-[28px] h-7 px-2 rounded text-[12px] text-academy-muted hover:text-academy-gold hover:bg-academy-card transition-colors ${t.className ?? ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto bg-academy-surface/30">
        <div className="relative mx-auto w-full min-h-full" style={{ maxWidth: '46rem' }}>
          {/* Backdrop: the same text, invisible, carrying the colour. */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none select-none"
            style={{ ...METRICS, color: 'transparent' }}
          >
            {segments.map((seg, i) => {
              if (!seg.annId) return <span key={i}>{seg.text}</span>;
              const color = SEV_COLOR[seg.severity ?? 'note'] ?? SEV_COLOR.note;
              const on = seg.annId === activeId;
              return (
                <span
                  key={i}
                  id={`mark-${seg.annId}`}
                  data-caret-anchor={on ? '1' : '0'}
                  style={{
                    background: `${color}${on ? '40' : '20'}`,
                    borderBottom: `2px solid ${color}`,
                    borderRadius: 2,
                  }}
                >
                  {seg.text}
                </span>
              );
            })}
          </div>

          <textarea
            ref={taRef}
            value={value}
            placeholder={placeholder}
            spellCheck
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onSelect={reportCaret}
            onClick={reportCaret}
            className="relative block w-full resize-none bg-transparent text-academy-text placeholder-academy-muted/60 focus:outline-none"
            style={{ ...METRICS, caretColor: '#C9A84C', overflow: 'hidden', minHeight: '100%' }}
          />
        </div>
      </div>
    </div>
  );
});
