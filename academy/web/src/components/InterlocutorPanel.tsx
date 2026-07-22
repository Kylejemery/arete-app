'use client';

// The Interlocutor, invocable from anywhere the student writes.
//
// The Composer is the blank page, but most of the writing happens in Papers and
// the dissertation, and a profile built only from what the student volunteered
// to the Composer would be blind to it. One route, one critique_history, one
// profile, three surfaces.
//
// This is formative and never terminal: it does not save, submit, grade, or
// advance anything. The Examiner and the Writing Supervisor still own the
// verdict. Keep that distinction visible in the copy, since a button next to
// "Submit for Examination" invites the assumption that it is a pre-grade.

import { useState } from 'react';

export const MIN_CRITIQUE_CHARS = 40;

export interface CritiqueResult {
  critique: string;
  dimensions_flagged: string[];
  recorded: boolean;
}

// Minimal markdown: paragraphs, and **bold** for the rubric dimension names the
// agent emphasizes. Built as React nodes, never as raw HTML.
export function CritiqueBody({ critique }: { critique: string }) {
  return (
    <>
      {critique.split(/\n{2,}/).map((para, i) => (
        <p
          key={i}
          className="font-serif text-academy-text text-[15px] leading-[1.75] mb-5 whitespace-pre-wrap"
        >
          {para.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={j} className="text-academy-gold font-semibold">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </p>
      ))}
    </>
  );
}

export function DimensionChips({ dimensions }: { dimensions: string[] }) {
  return (
    <>
      {dimensions.map(d => (
        <span
          key={d}
          className="font-mono text-[10px] uppercase tracking-wider text-academy-muted border border-academy-border rounded px-2 py-0.5"
        >
          {d}
        </span>
      ))}
    </>
  );
}

export function AskInterlocutor({
  text,
  pieceTitle,
  label = 'Ask the Interlocutor',
  note = 'Diagnosis and questions, never a rewrite. Nothing is saved, submitted, or graded.',
}: {
  text: string;
  pieceTitle?: string;
  label?: string;
  note?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CritiqueResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submission = text.trim();
  const ready = submission.length >= MIN_CRITIQUE_CHARS && !busy;

  const ask = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/interlocutor/critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excerpt: submission,
          scope: 'document',
          pieceTitle: pieceTitle?.trim() || undefined,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'The Interlocutor is unavailable.');
        return;
      }
      setResult(data as CritiqueResult);
    } catch {
      setError('The Interlocutor could not be reached.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={ask}
          disabled={!ready}
          className="border border-academy-border text-academy-muted hover:text-academy-text hover:border-academy-gold font-semibold rounded-lg px-4 py-2 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? 'Reading…' : label}
        </button>
        <span className="text-academy-muted text-xs leading-relaxed">{note}</span>
      </div>

      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

      {result && (
        <section className="mt-6 border-l-2 border-academy-gold pl-5">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <p className="font-mono text-academy-gold text-xs uppercase tracking-widest mr-2">
              The Interlocutor
            </p>
            <DimensionChips dimensions={result.dimensions_flagged} />
          </div>
          <CritiqueBody critique={result.critique} />
          {!result.recorded && (
            <p className="text-academy-muted text-xs">
              Not written to your history, so it will not shape your profile.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
