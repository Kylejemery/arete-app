'use client';

// The review view: an immutable draft version rendered with the Interlocutor's
// annotations as colored, clickable spans, beside a margin of comment cards.
// There is no rich-text editor here on purpose (academy has none) — this reads a
// snapshot, and revision happens by accepting suggestions or editing back in the
// composer, which produces a new version.
//
// The comment cards live in CommentList, exported so the editor view can show the
// same comments beside the textarea while the student revises.

import { useState } from 'react';
import { buildSegments, type SpanInput } from '@/lib/annotations';
import { DimensionChips } from '@/components/InterlocutorPanel';

export interface Annotation {
  id: string;
  start_offset: number | null;
  end_offset: number | null;
  quote: string;
  dimension: string;
  severity: string;
  comment: string;
  suggestion: string | null;
  status: string; // open | accepted | dismissed
}

// Tuned for the navy (#0A1628) dark surface. Background rides at low alpha; the
// underline and dot use the full color.
export const SEVERITY: Record<string, { color: string; label: string; rank: number }> = {
  critical: { color: '#E06B6B', label: 'Critical', rank: 5 },
  major: { color: '#C9A84C', label: 'Major', rank: 4 },
  minor: { color: '#6B9BD1', label: 'Minor', rank: 3 },
  note: { color: '#7A8FA6', label: 'Note', rank: 2 },
  strength: { color: '#6BBF8A', label: 'Strength', rank: 1 },
};
const sevOf = (s: string) => SEVERITY[s] ?? SEVERITY.note;

function SeverityDot({ severity }: { severity: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: sevOf(severity).color }}
      aria-hidden
    />
  );
}

// The Interlocutor's summary lead: the single most serious problem.
export function SummaryLead({ summary }: { summary: string }) {
  return (
    <p className="text-academy-muted text-[15px] leading-relaxed">
      <span className="font-mono text-academy-gold text-[10px] uppercase tracking-widest block mb-1.5">
        The central problem
      </span>
      {summary}
    </p>
  );
}

// One comment card. Located and general (unlocated) annotations both render here;
// only located ones also become an inline highlight in the reviewed text.
function AnnotationCard({
  a,
  active,
  readOnly,
  onFocus,
  onAccept,
  onDismiss,
}: {
  a: Annotation;
  active: boolean;
  readOnly: boolean;
  onFocus?: (id: string) => void;
  onAccept?: (a: Annotation) => void;
  onDismiss?: (a: Annotation) => void;
}) {
  const sev = sevOf(a.severity);
  const dealt = a.status !== 'open';
  const clickable = a.start_offset !== null && !!onFocus;
  return (
    <div
      id={`card-${a.id}`}
      onClick={() => clickable && onFocus?.(a.id)}
      className="rounded-lg border p-3.5 transition-colors"
      style={{
        borderColor: active ? sev.color : 'rgba(30,50,88,0.9)',
        background: active ? `${sev.color}12` : 'rgba(15,30,56,0.5)',
        cursor: clickable ? 'pointer' : 'default',
        opacity: dealt ? 0.55 : 1,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <SeverityDot severity={a.severity} />
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: sev.color }}>
          {sev.label}
        </span>
        <DimensionChips dimensions={[a.dimension]} />
        {a.start_offset === null && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-academy-muted ml-auto">
            general
          </span>
        )}
        {dealt && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-academy-muted ml-auto">
            {a.status}
          </span>
        )}
      </div>

      {/* Show the quoted span for general notes (no highlight to point at) and,
          in the editor view, for located ones too, so the comment stands alone. */}
      {a.quote && (
        <p className="font-serif italic text-academy-muted text-[13px] mb-1.5 leading-snug">
          &ldquo;{a.quote.slice(0, 160)}
          {a.quote.length > 160 ? '…' : ''}&rdquo;
        </p>
      )}

      <p className="font-serif text-academy-text text-[14px] leading-relaxed">{a.comment}</p>

      {a.suggestion && (
        <div className="mt-2.5 pt-2.5 border-t border-academy-border">
          <span className="font-mono text-[9px] uppercase tracking-wider text-academy-muted block mb-1">
            Suggested rewrite
          </span>
          <p className="font-serif text-academy-gold text-[14px] leading-relaxed">{a.suggestion}</p>
          {!readOnly && a.status === 'open' && (
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={e => {
                  e.stopPropagation();
                  onAccept?.(a);
                }}
                className="bg-academy-gold text-academy-bg font-semibold rounded px-3 py-1.5 text-xs hover:opacity-90"
              >
                Accept
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onDismiss?.(a);
                }}
                className="border border-academy-border text-academy-muted hover:text-academy-text rounded px-3 py-1.5 text-xs"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {!a.suggestion && !readOnly && a.status === 'open' && (
        <button
          onClick={e => {
            e.stopPropagation();
            onDismiss?.(a);
          }}
          className="mt-2 font-mono text-[10px] uppercase tracking-wider text-academy-muted hover:text-academy-text"
        >
          Mark addressed
        </button>
      )}
    </div>
  );
}

// The comment column. Renders located and general annotations as cards, gravest
// first. Used inside MarkedUpDraft (with span linking) and beside the editor
// textarea (read-only reference while revising).
export function CommentList({
  annotations,
  generalNotes = [],
  summary,
  readOnly = false,
  onAccept,
  onDismiss,
  activeId = null,
  onCardFocus,
}: {
  annotations: Annotation[];
  generalNotes?: Annotation[];
  summary?: string;
  readOnly?: boolean;
  onAccept?: (a: Annotation) => void;
  onDismiss?: (a: Annotation) => void;
  activeId?: string | null;
  onCardFocus?: (id: string) => void;
}) {
  const cards = [...annotations, ...generalNotes].sort(
    (a, b) =>
      sevOf(b.severity).rank - sevOf(a.severity).rank ||
      (a.start_offset ?? 1e9) - (b.start_offset ?? 1e9)
  );

  return (
    <div className="space-y-3">
      {summary && (
        <div className="rounded-lg border border-academy-gold/25 bg-academy-surface/40 p-3.5">
          <SummaryLead summary={summary} />
        </div>
      )}
      {cards.length === 0 && (
        <p className="font-serif italic text-academy-muted text-sm">
          Nothing marked. Either the draft holds, or there was too little to judge.
        </p>
      )}
      {cards.map(a => (
        <AnnotationCard
          key={a.id}
          a={a}
          active={a.id === activeId}
          readOnly={readOnly}
          onFocus={onCardFocus}
          onAccept={onAccept}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

export function MarkedUpDraft({
  content,
  annotations,
  generalNotes = [],
  summary,
  readOnly = false,
  onAccept,
  onDismiss,
}: {
  content: string;
  annotations: Annotation[];
  generalNotes?: Annotation[];
  summary?: string;
  readOnly?: boolean;
  onAccept?: (a: Annotation) => void;
  onDismiss?: (a: Annotation) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Only open, located annotations get an inline highlight. Accepted or dismissed
  // ones drop out of the text but remain in the margin as a record.
  const inline = annotations.filter(
    a => a.start_offset !== null && a.end_offset !== null && a.status === 'open'
  );
  const spans: SpanInput[] = inline.map(a => ({
    id: a.id,
    start: a.start_offset as number,
    end: a.end_offset as number,
    severity: a.severity,
  }));
  const segments = buildSegments(content, spans);

  const focusCard = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(`card-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const focusSpan = (id: string) => {
    setActiveId(id);
    const el = document.getElementById(`hl-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 items-start">
      {/* ── The marked-up text ─────────────────────────────────────────────── */}
      <article className="font-serif text-academy-text text-[16px] leading-[1.9] whitespace-pre-wrap">
        {summary && (
          <div className="mb-6 pb-5 border-b border-academy-gold/25">
            <SummaryLead summary={summary} />
          </div>
        )}
        {segments.map((seg, i) => {
          if (!seg.annId) return <span key={i}>{seg.text}</span>;
          const sev = sevOf(seg.severity ?? 'note');
          const isActive = seg.annId === activeId;
          return (
            <span
              key={i}
              id={`hl-${seg.annId}`}
              onClick={() => focusCard(seg.annId as string)}
              className="cursor-pointer rounded-sm transition-colors"
              style={{
                borderBottom: `2px solid ${sev.color}`,
                background: `${sev.color}${isActive ? '3a' : '1e'}`,
              }}
              title={`${sev.label}: ${seg.severity}`}
            >
              {seg.text}
            </span>
          );
        })}
      </article>

      {/* ── The margin ─────────────────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-4">
        <CommentList
          annotations={annotations}
          generalNotes={generalNotes}
          readOnly={readOnly}
          onAccept={onAccept}
          onDismiss={onDismiss}
          activeId={activeId}
          onCardFocus={focusSpan}
        />
      </aside>
    </div>
  );
}
