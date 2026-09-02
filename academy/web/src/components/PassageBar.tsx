'use client';

// Select a sentence, ask about that sentence. Without this, putting a question
// to the Interlocutor about one passage means describing which passage you mean,
// which is the slowest thing in the studio and the reason most questions never
// get asked. The bar floats over the selection and writes the question for you;
// the passage is quoted verbatim so the Interlocutor answers about that and not
// about the draft in general.

const ACTIONS = [
  {
    key: 'earned',
    label: 'Is this earned?',
    question: (p: string) =>
      `Is this passage earned by what comes before it, or am I asserting it?\n\n"${p}"`,
  },
  {
    key: 'doing',
    label: 'What is this doing?',
    question: (p: string) =>
      `What is this passage doing for the argument? If the answer is nothing, say so.\n\n"${p}"`,
  },
  {
    key: 'against',
    label: 'Argue against',
    question: (p: string) =>
      `Give me the strongest case against this passage. Do not soften it.\n\n"${p}"`,
  },
  {
    key: 'ask',
    label: 'Ask…',
    question: (p: string) => `About this passage:\n\n"${p}"\n\n`,
  },
] as const;

export function PassageBar({
  rect,
  passage,
  onAsk,
  onRetype,
}: {
  rect: DOMRect | null;
  passage: string;
  onAsk: (question: string) => void;
  /** Open the selection in the retype callout instead of asking about it. */
  onRetype?: () => void;
}) {
  if (!rect || !passage.trim()) return null;

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 rounded-full border border-academy-border bg-navy px-1.5 py-1 shadow-xl"
      style={{ top: Math.max(8, rect.top - 42), left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }}
      // Keep the textarea's selection alive while the bar is clicked.
      onMouseDown={e => e.preventDefault()}
    >
      {onRetype && (
        <>
          <button
            onClick={onRetype}
            title="Type over this passage in your own words (Ctrl+Enter)"
            className="whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-academy-gold transition-colors hover:bg-academy-card"
          >
            Retype
          </button>
          <span className="mx-0.5 h-3.5 w-px bg-academy-border" aria-hidden />
        </>
      )}
      {ACTIONS.map(a => (
        <button
          key={a.key}
          onClick={() => onAsk(a.question(passage.trim()))}
          className="whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-academy-muted transition-colors hover:bg-academy-card hover:text-academy-gold"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
