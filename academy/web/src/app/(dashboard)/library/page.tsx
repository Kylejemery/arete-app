'use client';

import { useState } from 'react';
import { Card, CardLabel } from '@/components/ui/Card';
import Topbar from '@/components/navigation/Topbar';

const CORPUS = [
  {
    author: 'Marcus Aurelius',
    slug: 'marcus-aurelius',
    emoji: '👑',
    works: [
      { title: 'Meditations', books: 'Books I–XII', description: 'Private philosophical journal of the emperor. Written in Greek. Never intended for publication.' },
    ],
    bio: 'Roman Emperor, 161–180 CE. Last of the Five Good Emperors. Student of the Stoic philosopher Rusticus.',
  },
  {
    author: 'Epictetus',
    slug: 'epictetus',
    emoji: '⛓️',
    works: [
      { title: 'Enchiridion', books: 'Complete', description: 'The handbook — a condensed guide to Stoic practice compiled by Arrian.' },
      { title: 'Discourses', books: 'Books I–IV', description: 'Lecture notes taken by Arrian. The fullest record of Epictetan teaching.' },
    ],
    bio: 'Born a slave in Hierapolis. Freed. Founded a school in Nicopolis. Taught for decades. Wrote nothing himself.',
  },
  {
    author: 'Seneca',
    slug: 'seneca',
    emoji: '✒️',
    works: [
      { title: 'Letters to Lucilius', books: '124 Letters', description: 'The most readable Stoic text. Letters written near the end of his life to a younger friend.' },
      { title: 'On the Shortness of Life', books: 'Complete', description: 'The argument that we do not have too little time — we waste what we have.' },
      { title: 'On the Happy Life', books: 'Complete', description: 'An examination of whether virtue alone is sufficient for happiness.' },
    ],
    bio: 'Statesman, playwright, philosopher. Advisor to Nero. Ordered to commit suicide, 65 CE. Complied.',
  },
];

export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [expandedAuthor, setExpandedAuthor] = useState<string | null>('marcus-aurelius');

  const filtered = CORPUS.filter(entry =>
    search === '' ||
    entry.author.toLowerCase().includes(search.toLowerCase()) ||
    entry.works.some(w => w.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <Topbar
        title="Primary Corpus"
        subtitle="The texts that constitute the PhD curriculum — no translations of translations, no summaries"
      />

      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search authors or titles..."
          className="w-full max-w-md bg-academy-surface border border-academy-border rounded-lg px-4 py-2.5 text-academy-text placeholder-academy-muted focus:outline-none focus:border-academy-gold transition-colors text-sm"
        />
      </div>

      <div className="space-y-5">
        {filtered.map(entry => {
          const isExpanded = expandedAuthor === entry.slug;
          return (
            <Card key={entry.slug} gold={isExpanded}>
              <button
                className="w-full text-left"
                onClick={() => setExpandedAuthor(isExpanded ? null : entry.slug)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{entry.emoji}</span>
                    <div>
                      <h3 className="font-serif text-xl text-academy-text">{entry.author}</h3>
                      <p className="text-academy-muted text-xs mt-0.5 italic">{entry.bio}</p>
                    </div>
                  </div>
                  <span className="text-academy-muted text-sm ml-4">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="mt-5 pt-5 border-t border-academy-border space-y-4">
                  <CardLabel>Works in Corpus</CardLabel>
                  {entry.works.map(work => (
                    <div key={work.title} className="bg-academy-surface rounded-lg p-4 border border-academy-border">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <p className="text-academy-text font-semibold text-sm">{work.title}</p>
                        <span className="text-academy-muted text-xs flex-shrink-0">{work.books}</span>
                      </div>
                      <p className="text-academy-muted text-xs leading-relaxed">{work.description}</p>
                    </div>
                  ))}
                  <p className="text-academy-muted text-xs italic pt-2">
                    Full text retrieval available during seminars via RAG. The Socratic Proctor and Archivist draw from this corpus when relevant passages are required.
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-academy-muted text-sm italic">No texts found matching &ldquo;{search}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
