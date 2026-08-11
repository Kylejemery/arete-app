'use client';

// The review view: an immutable draft version rendered with the Interlocutor's
// annotations as colored, clickable spans, beside a margin of comment cards.
// There is no rich-text editor here on purpose (academy has none) — this reads a
// snapshot, and revision happens by accepting suggestions or editing back in the
// composer, which produces a new version.
//
// Presentational: it owns only which annotation is highlighted. Accept / dismiss
// and the working-copy splice belong to the page, so one place owns the draft.

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
  // ones drop out of the text (the student has dealt with them) but remain in the
  // margin as a record.
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

  // Margin order: gravest first, then document position.
  const ordered = [...annotations].sort(
    (a, b) =>
      sevOf(b.severity).rank - sevOf(a.severity).rank ||
      (a.start_offset ?? 1e9) - (b.start_offset ?? 1e9)
  );

  const focus = (id: string) => {
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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
      {/* ── The marked-up text ─────────────────────────────────────────────── */}
      <article className="font-serif text-academy-text text-[16px] leading-[1.9] whitespace-pre-wrap">
        {summary && (
          <p className="mb-6 pb-5 border-b border-academy-gold/25 text-academy-muted text-[15px] leading-relaxed not-italic">
            <span className="font-mono text-academy-gold text-[10px] uppercase tracking-widest block mb-1.5">
              The central problem
            </span>
            {summary}
          </p>
        )}
        {segments.map((seg, i) => {
          if (!seg.annId) return <span key={i}>{seg.text}</span>;
          const sev = sevOf(seg.severity ?? 'note');
          const isActive = seg.annId === activeId;
          return (
            <span
              key={i}
              id={`hl-${seg.annId}`}
              onClick={() => focus(seg.annId as string)}
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
      <aside className="lg:sticky lg:top-4 space-y-3">
        {ordered.length === 0 && generalNotes.length === 0 && (
          <p className="font-serif italic text-academy-muted text-sm">
            Nothing marked. Either the draft holds, or there was too little to judge.
          </p>
        )}

        {ordered.map(a => {
          const sev = sevOf(a.severity);
          const isActive = a.id === activeId;
          const dealt = a.status !== 'open';
          return (
            <div
              key={a.id}
              id={`card-${a.id}`}
              onClick={() => a.start_offset !== null && focusSpan(a.id)}
              className="rounded-lg border p-3.5 transition-colors"
              style={{
                borderColor: isActive ? sev.color : 'rgba(30,50,88,0.9)',
                background: isActive ? `${sev.color}12` : 'rgba(15,30,56,0.5)',
                cursor: a.start_offset !== null ? 'pointer' : 'default',
                opacity: dealt ? 0.55 : 1,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <SeverityDot severity={a.severity} />
                <span
                  className="font-mono text-[10px] uppercase tracking-wider"
                  style={{ color: sev.color }}
                >
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

              {a.start_offset === null && a.quote && (
                <p className="font-serif italic text-academy-muted text-[13px] mb-1.5 leading-snug">
                  &ldquo;{a.quote.slice(0, 140)}
                  {a.quote.length > 140 ? '…' : ''}&rdquo;
                </p>
              )}

              <p className="font-serif text-academy-text text-[14px] leading-relaxed">
                {a.comment}
              </p>

              {a.suggestion && (
                <div className="mt-2.5 pt-2.5 border-t border-academy-border">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-academy-muted block mb-1">
                    Suggested rewrite
                  </span>
                  <p className="font-serif text-academy-gold text-[14px] leading-relaxed">
                    {a.suggestion}
                  </p>
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

              {/* A diagnosis with no rewrite can still be dismissed once addressed. */}
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
        })}
      </aside>
    </div>
  );
}
