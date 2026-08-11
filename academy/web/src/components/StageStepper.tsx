'use client';

// The guided-flow stepper. Five stages, non-blocking: clicking one sets the
// piece's stage, which tunes what the Interlocutor weights and whether it offers
// rewrites. It never gates a submission — a student can draft first and name the
// thesis after, or jump straight to polish. Below the rail sits the current
// stage's intent and a short checklist: guidance, not requirements.

import { STAGES, STAGE_CHECKLIST, type Stage } from '@/lib/interlocutor';

export function StageStepper({
  stage,
  onChange,
}: {
  stage: Stage;
  onChange: (s: Stage) => void;
}) {
  const currentIdx = STAGES.findIndex(s => s.id === stage);
  const active = STAGES[currentIdx] ?? STAGES[0];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 mb-3">
        {STAGES.map((s, i) => {
          const isCurrent = s.id === stage;
          const isPast = i < currentIdx;
          return (
            <div key={s.id} className="flex items-center gap-1.5 flex-1 min-w-0">
              <button
                onClick={() => onChange(s.id)}
                className="flex items-center gap-2 min-w-0 group"
                title={s.blurb}
              >
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] border transition-colors ${
                    isCurrent
                      ? 'bg-academy-gold text-academy-bg border-academy-gold'
                      : isPast
                        ? 'border-academy-gold/60 text-academy-gold/80'
                        : 'border-academy-border text-academy-muted group-hover:border-academy-gold/50'
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`font-mono text-[11px] uppercase tracking-wider truncate transition-colors ${
                    isCurrent
                      ? 'text-academy-gold'
                      : 'text-academy-muted group-hover:text-academy-text'
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {i < STAGES.length - 1 && (
                <span
                  className={`h-px flex-1 min-w-[8px] ${isPast ? 'bg-academy-gold/40' : 'bg-academy-border'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-academy-border bg-academy-surface/40 px-4 py-3">
        <p className="font-serif italic text-academy-text text-sm mb-2">{active.blurb}</p>
        <ul className="space-y-1">
          {STAGE_CHECKLIST[active.id].map((c, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-academy-muted text-[13px] leading-relaxed"
            >
              <span className="text-academy-gold mt-0.5" aria-hidden>
                ·
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
