'use client';

// The read view of a draft: the same text the student typed, typeset as an essay
// instead of shown with its markdown still on. Headings, quotations, and lists
// come out formatted, so the composer has a page to look at as well as a page to
// type on. Reuses the Scribe prose parser, which deliberately passes anything it
// does not recognise through as body text.

import { Fragment, createContext, useContext, type ReactNode } from 'react';
import { highlightSpans, parseProse, parseInline, type Block } from '@/lib/scribe/prose';
import type { MetricKind } from '@/lib/scribe/voice-metrics';

// The voice-meter category being shown, if any. Context rather than a prop
// because every block and list item renders inline text and none of them care
// what a highlight is.
const HighlightCtx = createContext<MetricKind | null>(null);

const HIT = 'rounded-sm bg-academy-gold/30 underline decoration-dotted decoration-academy-gold underline-offset-2';

function Inlines({ text }: { text: string }) {
  const metric = useContext(HighlightCtx);
  const segs = parseInline(text);
  // Ranges are measured over the text with its markdown already stripped, which
  // is the same string the segments concatenate to, so the offsets line up.
  const spans = metric ? highlightSpans(segs.map(s => s.text).join(''), { kind: 'metric', metric }) : [];

  let cursor = 0;
  return (
    <>
      {segs.map((seg, i) => {
        const from = cursor;
        const to = cursor + seg.text.length;
        cursor = to;

        let inner: ReactNode = seg.text;
        const overlapping = spans.filter(s => s.start < to && s.end > from);
        if (overlapping.length) {
          const parts: ReactNode[] = [];
          let at = from;
          for (const s of overlapping) {
            const hs = Math.max(s.start, from);
            const he = Math.min(s.end, to);
            if (hs > at) parts.push(seg.text.slice(at - from, hs - from));
            parts.push(<mark key={hs} className={HIT}>{seg.text.slice(hs - from, he - from)}</mark>);
            at = he;
          }
          if (at < to) parts.push(seg.text.slice(at - from));
          inner = parts;
        }

        if (seg.type === 'strong') return <strong key={i} className="font-semibold text-academy-text">{inner}</strong>;
        if (seg.type === 'em') return <em key={i}>{inner}</em>;
        if (seg.type === 'gap')
          return (
            <mark key={i} className="bg-academy-gold/20 text-academy-gold rounded px-1">
              {inner}
            </mark>
          );
        return <Fragment key={i}>{inner}</Fragment>;
      })}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'h1':
      return <h1 className="font-serif text-academy-text text-3xl leading-snug mt-10 mb-4 first:mt-0"><Inlines text={block.text} /></h1>;
    case 'h2':
      return <h2 className="font-serif text-academy-text text-2xl leading-snug mt-9 mb-3"><Inlines text={block.text} /></h2>;
    case 'h3':
      return <h3 className="font-serif text-academy-gold text-lg leading-snug mt-7 mb-2"><Inlines text={block.text} /></h3>;
    case 'quote':
      return (
        <blockquote className="border-l-2 border-academy-gold/50 pl-4 my-5 font-serif italic text-academy-muted text-[16px] leading-[1.85]">
          <Inlines text={block.text} />
        </blockquote>
      );
    case 'hr':
      return <hr className="my-8 border-academy-border" />;
    case 'list':
      return block.ordered ? (
        <ol className="list-decimal pl-6 my-4 space-y-1.5 font-serif text-[17px] leading-[1.9]">
          {block.items.map((it, i) => <li key={i}><Inlines text={it} /></li>)}
        </ol>
      ) : (
        <ul className="list-disc pl-6 my-4 space-y-1.5 font-serif text-[17px] leading-[1.9]">
          {block.items.map((it, i) => <li key={i}><Inlines text={it} /></li>)}
        </ul>
      );
    default:
      return <p className="font-serif text-[17px] leading-[1.9] my-4"><Inlines text={block.text} /></p>;
  }
}

export function ProsePage({
  text,
  title,
  highlight = null,
}: {
  text: string;
  title?: string;
  highlight?: MetricKind | null;
}) {
  const blocks = parseProse(text);
  return (
    <HighlightCtx.Provider value={highlight}>
      <div className="h-full overflow-auto bg-academy-surface/30">
        <div className="mx-auto w-full text-academy-text" style={{ maxWidth: '46rem', padding: '3rem 3.25rem 6rem' }}>
          {title && <p className="font-mono text-academy-muted text-[10px] uppercase tracking-widest mb-6">{title}</p>}
          {blocks.length === 0 && (
            <p className="font-serif italic text-academy-muted">Nothing written yet.</p>
          )}
          {blocks.map((b, i) => <BlockView key={i} block={b} />)}
        </div>
      </div>
    </HighlightCtx.Provider>
  );
}
