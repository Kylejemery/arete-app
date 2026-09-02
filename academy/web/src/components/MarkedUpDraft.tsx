'use client';

// The margin: the Interlocutor's judgments as comment cards, and (for a past
// version, which is immutable) the reviewed text with its marks rendered.
//
// The live draft is not rendered here. It lives in DraftEditor, where the same
// marks sit under an editable page, so accepting a rewrite changes the document
// in place the way a word processor does. This file holds what both views share:
// the severity palette, the summary lead, and the comment cards.

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
    <p className="text-academy-muted text-[14px] leading-relaxed">
      <span className="font-mono text-academy-gold text-[10px] uppercase tracking-widest block mb-1.5">
        The central problem
      </span>
      {summary}
    </p>
  );
}

// One comment card. Located and unlocated annotations both render here; only a
// located one also colours a passage in the document.
function AnnotationCard({
  a,
  active,
  readOnly,
  onFocus,
  onAccept,
  onEdit,
  onDismiss,
}: {
  a: Annotation;
  active: boolean;
  readOnly: boolean;
  onFocus?: (id: string) => void;
  onAccept?: (a: Annotation) => void;
  /** Open the rewrite under its sentence, to be typed over before it is kept. */
  onEdit?: (a: Annotation) => void;
  onDismiss?: (a: Annotation) => void;
}) {
  const sev = sevOf(a.severity);
  const dealt = a.status !== 'open';
  const clickable = a.start_offset !== null && !!onFocus;
  return (
    <div
      id={`card-${a.id}`}
      onClick={() => clickable && onFocus?.(a.id)}
      className="rounded-lg border p-3 transition-colors"
      style={{
        borderColor: active ? sev.color : 'rgba(30,50,88,0.9)',
        background: active ? `${sev.color}12` : 'rgba(15,30,56,0.5)',
        cursor: clickable ? 'pointer' : 'default',
        opacity: dealt ? 0.5 : 1,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <SeverityDot severity={a.severity} />
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: sev.color }}>
          {sev.label}
        </span>
        <DimensionChips dimensions={[a.dimension]} />
        {dealt ? (
          <span className="font-mono text-[9px] uppercase tracking-wider text-academy-muted ml-auto">
            {a.status === 'accepted' ? 'accepted' : 'rejected'}
          </span>
        ) : (
          a.start_offset === null && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-academy-muted ml-auto">
              general
            </span>
          )
        )}
      </div>

      {a.quote && (
        <p className="font-serif italic text-academy-muted text-[12.5px] mb-1.5 leading-snug">
          &ldquo;{a.quote.slice(0, 140)}
          {a.quote.length > 140 ? '…' : ''}&rdquo;
        </p>
      )}

      <p className="font-serif text-academy-text text-[13.5px] leading-relaxed">{a.comment}</p>

      {a.suggestion && (
        <div className="mt-2.5 pt-2.5 border-t border-academy-border">
          <span className="font-mono text-[9px] uppercase tracking-wider text-academy-muted block mb-1">
            Suggested rewrite
          </span>
          <p className="font-serif text-academy-gold text-[13.5px] leading-relaxed">{a.suggestion}</p>
          {!readOnly && a.status === 'open' && (
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={e => {
                  e.stopPropagation();
                  onAccept?.(a);
                }}
                title={
                  a.start_offset === null
                    ? 'This comment is no longer tied to a passage, so accepting only files it as handled.'
                    : 'Replace the marked passage with this rewrite'
                }
                className="bg-academy-gold text-academy-bg font-semibold rounded px-3 py-1 text-[11px] hover:opacity-90"
              >
                Accept
              </button>
              {onEdit && a.start_offset !== null && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onEdit(a);
                  }}
                  title="Open the rewrite under the sentence and type it over in your own words"
                  className="border border-academy-gold/50 text-academy-gold hover:bg-academy-gold/10 rounded px-3 py-1 text-[11px]"
                >
                  Retype it
                </button>
              )}
              <button
                onClick={e => {
                  e.stopPropagation();
                  onDismiss?.(a);
                }}
                className="border border-academy-border text-academy-muted hover:text-academy-text rounded px-3 py-1 text-[11px]"
              >
                Reject
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

// The comment column. Located and general annotations as cards, gravest first.
export function CommentList({
  annotations,
  generalNotes = [],
  summary,
  readOnly = false,
  onAccept,
  onEdit,
  onDismiss,
  activeId = null,
  onCardFocus,
}: {
  annotations: Annotation[];
  generalNotes?: Annotation[];
  summary?: string;
  readOnly?: boolean;
  onAccept?: (a: Annotation) => void;
  onEdit?: (a: Annotation) => void;
  onDismiss?: (a: Annotation) => void;
  activeId?: string | null;
  onCardFocus?: (id: string) => void;
}) {
  const cards = [...annotations, ...generalNotes].sort(
    (a, b) =>
      Number(a.status !== 'open') - Number(b.status !== 'open') ||
      sevOf(b.severity).rank - sevOf(a.severity).rank ||
      (a.start_offset ?? 1e9) - (b.start_offset ?? 1e9)
  );

  return (
    <div className="space-y-2.5">
      {summary && (
        <div className="rounded-lg border border-academy-gold/25 bg-academy-surface/40 p-3">
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
          onEdit={onEdit}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

// A past version's text, marked up and read-only. The live draft uses
// DraftEditor instead, which shows the same marks under an editable page.
export function MarkedUpText({
  content,
  annotations,
  summary,
  activeId = null,
  onSpanClick,
}: {
  content: string;
  annotations: Annotation[];
  summary?: string;
  activeId?: string | null;
  onSpanClick?: (id: string) => void;
}) {
  const spans: SpanInput[] = annotations
    .filter(a => a.start_offset !== null && a.end_offset !== null && a.status === 'open')
    .map(a => ({
      id: a.id,
      start: a.start_offset as number,
      end: a.end_offset as number,
      severity: a.severity,
    }));
  const segments = buildSegments(content, spans);

  return (
    <div className="h-full overflow-auto bg-academy-surface/30">
      <article
        className="mx-auto w-full font-serif text-academy-text text-[17px] leading-[1.9] whitespace-pre-wrap"
        style={{ maxWidth: '46rem', padding: '3rem 3.25rem 6rem' }}
      >
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
              id={`mark-${seg.annId}`}
              onClick={() => onSpanClick?.(seg.annId as string)}
              className="cursor-pointer rounded-sm transition-colors"
              style={{
                borderBottom: `2px solid ${sev.color}`,
                background: `${sev.color}${isActive ? '40' : '20'}`,
              }}
              title={sev.label}
            >
              {seg.text}
            </span>
          );
        })}
      </article>
    </div>
  );
}
