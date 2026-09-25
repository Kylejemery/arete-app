'use client';

import type { Counselor } from '@/lib/types';
import { FREE_COUNSELOR_SLUGS, CABINET_CHAIR_SLUG } from '@/lib/db';

// Step three of web setup (retention plan R10): the three free counselors,
// all preselected, with the locked library beneath as a tease. Pure
// presentation so it can be rendered with fixture counselors.
//
// Marcus chairs every Cabinet (decision D5) and cannot be removed here; the
// other two free counselors toggle, with at least one kept, which mirrors
// the mobile wizard's step ten.

interface SetupCabinetPickerProps {
  counselors: Counselor[];
  selected: string[];
  onToggle: (slug: string) => void;
}

const FREE_SET: readonly string[] = FREE_COUNSELOR_SLUGS;

export default function SetupCabinetPicker({ counselors, selected, onToggle }: SetupCabinetPickerProps) {
  const bySlug = new Map(counselors.map(c => [c.slug, c]));
  const free = FREE_SET.map(slug => bySlug.get(slug)).filter((c): c is Counselor => !!c);
  const locked = counselors.filter(c => !FREE_SET.includes(c.slug) && c.slug !== 'futureSelf');
  const optionalCount = selected.filter(s => s !== CABINET_CHAIR_SLUG).length;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {free.map(c => {
          const isChair = c.slug === CABINET_CHAIR_SLUG;
          const isSelected = selected.includes(c.slug);
          const isLastOptional = isSelected && !isChair && optionalCount <= 1;
          const disabled = isChair || isLastOptional;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => { if (!disabled) onToggle(c.slug); }}
              aria-pressed={isSelected}
              aria-disabled={disabled}
              title={isChair ? 'Marcus chairs every Cabinet.' : isLastOptional ? 'Keep at least one counselor beside Marcus.' : undefined}
              className={`text-left rounded-xl p-4 transition-colors ${
                isSelected
                  ? 'bg-arete-surface border-2 border-arete-gold'
                  : 'bg-arete-surface border border-arete-border opacity-70 hover:opacity-100'
              } ${disabled ? 'cursor-default' : 'cursor-pointer hover:border-arete-gold/60'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-arete-text font-bold text-sm leading-snug">{c.name}</p>
                <span className={`text-base leading-none ${isSelected ? 'text-arete-gold' : 'text-arete-border'}`} aria-hidden>
                  {isSelected ? '✓' : '○'}
                </span>
              </div>
              <p className="text-arete-muted text-xs mt-1">
                {isChair ? 'Chair, always present' : c.dates || c.category}
              </p>
              <p className="text-arete-muted text-xs mt-2 line-clamp-2">{c.description}</p>
            </button>
          );
        })}
      </div>

      {locked.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-wider text-arete-muted mb-2">
            Also in the library, with Premium
          </p>
          <div className="flex flex-wrap gap-2" aria-label="Premium counselors">
            {locked.map(c => (
              <span
                key={c.slug}
                className="inline-flex items-center gap-1 rounded-full border border-arete-border bg-arete-bg/60 px-3 py-1 text-xs text-arete-muted"
              >
                <span aria-hidden>🔒</span>
                {c.name}
              </span>
            ))}
          </div>
          <p className="text-arete-muted text-xs mt-2">
            You can change your Cabinet any time from the Cabinet page.
          </p>
        </div>
      )}
    </div>
  );
}
