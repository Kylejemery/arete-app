'use client';

// The version rail. Each submission for markup snapshots an immutable draft; this
// lists them newest first with a severity tally, and lets the student open any
// past version's markup read-only. This is the visible half of "iterate through
// drafts": you can see the argument getting less red over time.

import { SEVERITY } from '@/components/MarkedUpDraft';

export interface DraftSummary {
  id: string;
  version: number;
  created_at: string;
  wordCount: number;
  counts: Record<string, number>; // severity -> count
}

const ORDER = ['critical', 'major', 'minor', 'note', 'strength'] as const;

function when(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function DraftHistory({
  versions,
  activeDraftId,
  onSelect,
}: {
  versions: DraftSummary[];
  activeDraftId: string | null;
  onSelect: (id: string) => void;
}) {
  if (versions.length === 0) return null;

  return (
    <div>
      <p className="font-mono text-academy-gold text-[10px] uppercase tracking-widest mb-3">
        Drafts
      </p>
      <div className="space-y-1.5">
        {versions.map(v => {
          const isActive = v.id === activeDraftId;
          const pips = ORDER.filter(s => (v.counts[s] ?? 0) > 0);
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                isActive
                  ? 'border-academy-gold bg-academy-gold/10'
                  : 'border-academy-border hover:border-academy-gold/50'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-serif text-academy-text text-sm">
                  Draft v{v.version}
                </span>
                <span className="font-mono text-academy-muted text-[10px]">{when(v.created_at)}</span>
              </div>
              <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                {pips.length === 0 ? (
                  <span className="font-mono text-academy-muted text-[10px]">no marks</span>
                ) : (
                  pips.map(s => (
                    <span key={s} className="flex items-center gap-1" title={SEVERITY[s].label}>
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: SEVERITY[s].color }}
                      />
                      <span className="font-mono text-academy-muted text-[10px]">
                        {v.counts[s]}
                      </span>
                    </span>
                  ))
                )}
                <span className="font-mono text-academy-muted text-[10px] ml-auto">
                  {v.wordCount} words
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
