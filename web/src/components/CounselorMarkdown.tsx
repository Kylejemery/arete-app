'use client';

import { Fragment, type ReactNode } from 'react';

// Renders a counselor's reply (retention plan R4). The models answer in light
// markdown: **bold**, *italics*, --- rules, lists, > quotes. Before this the
// thread printed the asterisks. This is a small purpose-built renderer rather
// than a markdown library: the output is React elements only, never HTML
// strings, so nothing in a reply can inject markup, and the existing quote
// style (a bare paragraph in quotation marks) is preserved.

type Block =
  | { type: 'p'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'hr' }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'h'; text: string };

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    if (lines.length === 1 && /^([-*_])\1{2,}$/.test(lines[0])) { blocks.push({ type: 'hr' }); continue; }
    if (lines.every(l => /^[-*•]\s+/.test(l))) { blocks.push({ type: 'ul', items: lines.map(l => l.replace(/^[-*•]\s+/, '')) }); continue; }
    if (lines.every(l => /^\d+[.)]\s+/.test(l))) { blocks.push({ type: 'ol', items: lines.map(l => l.replace(/^\d+[.)]\s+/, '')) }); continue; }
    if (lines.every(l => /^>\s?/.test(l))) { blocks.push({ type: 'quote', text: lines.map(l => l.replace(/^>\s?/, '')).join(' ') }); continue; }
    if (lines.length === 1 && /^#{1,6}\s+/.test(lines[0])) { blocks.push({ type: 'h', text: lines[0].replace(/^#{1,6}\s+/, '') }); continue; }
    const joined = lines.join(' ');
    // A paragraph that is entirely a quotation keeps the quote treatment.
    if (/^["“].*["”]$/.test(joined) && joined.length > 2) { blocks.push({ type: 'quote', text: joined.replace(/^["“]|["”]$/g, '') }); continue; }
    blocks.push({ type: 'p', text: joined });
  }
  return blocks;
}

// Inline: ***bold italic***, **bold**, *italic* or _italic_, `code`.
const INLINE = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`)/g;

export function renderInline(text: string): ReactNode {
  const parts = text.split(INLINE);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('***') && part.endsWith('***') && part.length > 6) return <strong key={i}><em>{part.slice(3, -3)}</em></strong>;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      if (part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={i} style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.9em' }}>{part.slice(1, -1)}</code>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export default function CounselorMarkdown({ text, className = 'text-[14px] leading-relaxed' }: { text: string; className?: string }) {
  const serif = { fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' } as const;
  return (
    <>
      {parseBlocks(text).map((block, i) => {
        switch (block.type) {
          case 'hr':
            return <hr key={i} className="my-1" style={{ border: 0, borderTop: '1px solid rgba(201,168,76,0.3)' }} />;
          case 'quote':
            return (
              <div
                key={i}
                className={`pl-3 py-1 italic ${className}`}
                style={{ borderLeft: '3px solid rgba(201,168,76,0.5)', fontFamily: 'var(--font-serif, Georgia, serif)', color: '#c9a84c' }}
              >
                &ldquo;{renderInline(block.text)}&rdquo;
              </div>
            );
          case 'ul':
          case 'ol': {
            const Tag = block.type;
            return (
              <Tag key={i} className={`${className} pl-5 ${block.type === 'ul' ? 'list-disc' : 'list-decimal'} flex flex-col gap-1`} style={serif}>
                {block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
              </Tag>
            );
          }
          case 'h':
            return <p key={i} className={`${className} font-semibold`} style={serif}>{renderInline(block.text)}</p>;
          default:
            return <p key={i} className={className} style={serif}>{renderInline(block.text)}</p>;
        }
      })}
    </>
  );
}
