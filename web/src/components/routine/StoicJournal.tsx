'use client';

export interface StoicJournalProps {
  prompt: string;
  answer: string;
  saved: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onEdit: () => void;
}

/**
 * The evening Stoic Journal block: one prompt per weekday, a textarea, and a
 * saved card with a pencil back to edit mode. Saving is handled by the parent
 * (check-in row + one journal entry per day).
 */
export default function StoicJournal({
  prompt,
  answer,
  saved,
  onChange,
  onSave,
  onEdit,
}: StoicJournalProps) {
  return (
    <div className="px-4 pb-2">
      <div
        className="rounded-2xl border p-4"
        style={{ background: 'rgba(20,27,52,0.5)', borderColor: 'rgba(255,255,255,0.07)' }}
      >
        <div className="flex gap-2.5 items-center mb-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.3)',
              color: '#c9a84c',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div
            className="text-[9.5px] tracking-[1.5px] uppercase"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
          >
            Stoic Journal
          </div>
        </div>

        <div
          className="italic text-[18px] leading-snug tracking-tight mb-3"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          &ldquo;{prompt}&rdquo;
        </div>

        {saved ? (
          <div
            className="px-3 py-2.5 rounded-lg animate-[arete-fade-in_180ms_ease-out]"
            style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[9px] tracking-[1.4px] uppercase"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
              >
                ✓ Saved to Journal
              </span>
              <button
                type="button"
                onClick={onEdit}
                aria-label="Edit reflection"
                className="ml-auto text-[11px] opacity-60 hover:opacity-100 transition-opacity"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
              >
                ✎ Edit
              </button>
            </div>
            <p
              className="italic text-[14px] leading-relaxed whitespace-pre-wrap"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
            >
              &ldquo;{answer}&rdquo;
            </p>
            <style>{'@keyframes arete-fade-in { from { opacity: 0 } to { opacity: 1 } }'}</style>
          </div>
        ) : (
          <>
            <textarea
              className="w-full rounded-lg px-3 py-2.5 text-[13px] outline-none resize-none min-h-[84px]"
              style={{
                background: 'transparent',
                border: '1px solid rgba(201,168,76,0.08)',
                fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                color: '#e6eef8',
              }}
              rows={4}
              placeholder="Write your thoughts..."
              value={answer}
              onChange={(e) => onChange(e.target.value)}
            />
            <button
              type="button"
              onClick={onSave}
              disabled={!answer.trim()}
              className="mt-2 px-4 py-2 rounded-lg text-[11px] tracking-[1.2px] uppercase font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              style={{ background: '#c9a84c', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)' }}
            >
              Save
            </button>
          </>
        )}
      </div>
    </div>
  );
}
