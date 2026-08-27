'use client';

// Everything the student has written. The composer used to remember exactly one
// piece, in localStorage, so starting a new one put the old one out of reach
// even though every version of it was still in the database. This lists the
// pieces themselves, newest first, and opening one loads its latest draft.

import { STAGES, type Stage } from '@/lib/interlocutor';

export interface WorkSummary {
  id: string;
  title: string;
  stage: string;
  updatedAt: string;
  versions: number;
  words: number;
}

function when(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const stageLabel = (s: string) => STAGES.find(x => x.id === (s as Stage))?.label ?? s;

export function WorksList({
  works,
  activePieceId,
  onOpen,
}: {
  works: WorkSummary[];
  activePieceId: string | null;
  onOpen: (id: string) => void;
}) {
  if (works.length === 0) return null;

  return (
    <div className="mb-5">
      <p className="font-mono text-academy-gold text-[10px] uppercase tracking-widest mb-3">
        Works
      </p>
      <div className="space-y-1.5">
        {works.map(w => {
          const isActive = w.id === activePieceId;
          return (
            <button
              key={w.id}
              onClick={() => onOpen(w.id)}
              disabled={isActive}
              className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                isActive
                  ? 'border-academy-gold bg-academy-gold/10 cursor-default'
                  : 'border-academy-border hover:border-academy-gold/50'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-serif text-academy-text text-[14px] leading-snug truncate">
                  {w.title?.trim() || 'Untitled'}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-academy-muted flex-shrink-0">
                  {when(w.updatedAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 font-mono text-[9px] uppercase tracking-wider text-academy-muted">
                <span className="text-academy-gold/80">{stageLabel(w.stage)}</span>
                <span>
                  {w.versions} version{w.versions === 1 ? '' : 's'}
                </span>
                {w.words > 0 && <span>{w.words.toLocaleString()} words</span>}
                {isActive && <span className="ml-auto text-academy-gold">open</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
