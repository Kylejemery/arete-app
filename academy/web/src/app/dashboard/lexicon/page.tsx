'use client';

import { useState } from 'react';
import { PHIL_701_LEXICON } from '@/data/lexicon';
import type { LexiconEntry } from '@/data/lexicon';

const DM_MONO = 'DM Mono, monospace';
const SERIF = "'Cormorant Garamond', Georgia, serif";

function firstTwoSentences(text: string): string {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (!matches || matches.length <= 2) return text;
  return matches.slice(0, 2).join('').trim();
}

function LexiconCard({ entry }: { entry: LexiconEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      id={entry.id}
      className="rounded-xl border border-academy-border bg-academy-surface transition-colors"
      style={{ scrollMarginTop: 80 }}
    >
      {/* Always-visible summary row */}
      <button
        className="w-full text-left px-6 py-5 flex items-start gap-5"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        {/* Greek script */}
        <div
          className="flex-shrink-0 w-24 text-right"
          style={{ fontFamily: SERIF, fontSize: 28, color: '#C9A84C', lineHeight: 1.1 }}
        >
          {entry.greek}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap mb-1">
            <span
              style={{ fontFamily: DM_MONO, fontSize: 13, color: '#C9A84C' }}
            >
              {entry.transliteration}
            </span>
            <span
              style={{ fontFamily: DM_MONO, fontSize: 11, color: '#4A5568' }}
            >
              {entry.partOfSpeech}
            </span>
          </div>
          <div
            className="text-academy-muted text-sm italic mb-2"
            style={{ lineHeight: 1.5 }}
          >
            {entry.literalMeaning}
          </div>
          <div className="text-academy-text text-sm" style={{ lineHeight: 1.65 }}>
            {expanded ? entry.stoicMeaning : firstTwoSentences(entry.stoicMeaning)}
          </div>
        </div>

        {/* Expand toggle */}
        <div
          className="flex-shrink-0 mt-1 text-academy-muted text-xs transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-6 pb-6 border-t border-academy-border">
          <div className="pt-5 space-y-4">

            {/* Translation note */}
            <div>
              <p
                className="mb-1"
                style={{ fontFamily: DM_MONO, fontSize: 11, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                What English loses
              </p>
              <p className="text-academy-muted text-sm italic" style={{ lineHeight: 1.65 }}>
                {entry.translationNote}
              </p>
            </div>

            {/* Sessions */}
            <div>
              <p
                className="mb-2"
                style={{ fontFamily: DM_MONO, fontSize: 11, color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.08em' }}
              >
                Appears in
              </p>
              <div className="flex flex-wrap gap-2">
                {entry.sessions.map(n => (
                  <span
                    key={n}
                    className="rounded px-2 py-0.5 text-xs"
                    style={{
                      fontFamily: DM_MONO,
                      background: 'rgba(201,168,76,0.08)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      color: '#C9A84C',
                    }}
                  >
                    Session {n}
                  </span>
                ))}
              </div>
            </div>

            {/* Related terms */}
            {entry.relatedTerms.length > 0 && (
              <div>
                <p
                  className="mb-2"
                  style={{ fontFamily: DM_MONO, fontSize: 11, color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  Related
                </p>
                <div className="flex flex-wrap gap-2">
                  {entry.relatedTerms.map(id => {
                    const related = PHIL_701_LEXICON.find(e => e.id === id);
                    return (
                      <a
                        key={id}
                        href={`#${id}`}
                        onClick={() => {
                          // Expand the related entry when navigating to it
                          setTimeout(() => {
                            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 50);
                        }}
                        className="rounded px-2 py-0.5 text-xs transition-colors hover:border-academy-gold"
                        style={{
                          fontFamily: DM_MONO,
                          background: 'rgba(201,168,76,0.05)',
                          border: '1px solid rgba(201,168,76,0.25)',
                          color: '#C9A84C',
                          textDecoration: 'none',
                        }}
                      >
                        {related ? related.transliteration : id}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LexiconPage() {
  const sorted = [...PHIL_701_LEXICON].sort((a, b) =>
    a.transliteration.localeCompare(b.transliteration)
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p
          className="mb-2"
          style={{ fontFamily: DM_MONO, fontSize: 12, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.12em' }}
        >
          PHIL 701 · Reference
        </p>
        <h1
          className="font-serif text-4xl text-academy-text mb-3"
          style={{ fontFamily: DM_MONO }}
        >
          Lexicon
        </h1>
        <p className="text-academy-muted text-sm" style={{ maxWidth: 540 }}>
          Core terms of Stoic philosophy — with what English loses.
        </p>
      </div>

      {/* Entry count */}
      <p
        className="mb-6"
        style={{ fontFamily: DM_MONO, fontSize: 11, color: '#4A5568', letterSpacing: '0.05em' }}
      >
        {sorted.length} entries · click any entry to expand
      </p>

      {/* Entry list */}
      <div className="flex flex-col gap-3">
        {sorted.map(entry => (
          <LexiconCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
