'use client';

// The read view of a draft: the same text the student typed, typeset as an essay
// instead of shown with its markdown still on. Headings, quotations, and lists
// come out formatted, so the composer has a page to look at as well as a page to
// type on. Reuses the Scribe prose parser, which deliberately passes anything it
// does not recognise through as body text.

import { Fragment } from 'react';
import { parseProse, parseInline, type Block } from '@/lib/scribe/prose';

function Inlines({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((seg, i) => {
        if (seg.type === 'strong') return <strong key={i} className="font-semibold text-academy-text">{seg.text}</strong>;
        if (seg.type === 'em') return <em key={i}>{seg.text}</em>;
        if (seg.type === 'gap')
          return (
            <mark key={i} className="bg-academy-gold/20 text-academy-gold rounded px-1">
              {seg.text}
            </mark>
          );
        return <Fragment key={i}>{seg.text}</Fragment>;
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

export function ProsePage({ text, title }: { text: string; title?: string }) {
  const blocks = parseProse(text);
  return (
    <div className="h-full overflow-auto bg-academy-surface/30">
      <div className="mx-auto w-full text-academy-text" style={{ maxWidth: '46rem', padding: '3rem 3.25rem 6rem' }}>
        {title && <p className="font-mono text-academy-muted text-[10px] uppercase tracking-widest mb-6">{title}</p>}
        {blocks.length === 0 && (
          <p className="font-serif italic text-academy-muted">Nothing written yet.</p>
        )}
        {blocks.map((b, i) => <BlockView key={i} block={b} />)}
      </div>
    </div>
  );
}
