'use client';

/** Two-letter monogram for the avatar disc. */
export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/** Splits a counselor reply into paragraphs and pull-quotes. */
export function parseBlocks(text: string): { type: 'quote' | 'para'; content: string }[] {
  return text
    .split(/\n\n+/)
    .map(block => {
      const t = block.trim();
      if ((t.startsWith('"') && t.endsWith('"')) || t.startsWith('> ')) {
        return { type: 'quote' as const, content: t.replace(/^> /, '').replace(/^"|"$/g, '') };
      }
      return { type: 'para' as const, content: t };
    })
    .filter(b => b.content.length > 0);
}

export interface AssistantBubbleProps {
  counselorName?: string | null;
  content: string;
  /** When given, a "Share" affordance appears under the reply. */
  onShare?: () => void;
}

export default function AssistantBubble({ counselorName, content, onShare }: AssistantBubbleProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] flex gap-3 items-start">
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full mt-1"
          style={{
            width: 32,
            height: 32,
            background: 'rgba(201,168,76,0.15)',
            border: '1px solid rgba(201,168,76,0.3)',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 9,
            fontWeight: 700,
            color: '#c9a84c',
          }}
        >
          {counselorName ? getInitials(counselorName) : 'TC'}
        </div>
        <div
          className="flex flex-col gap-2 px-4 py-3 flex-1"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '18px 18px 18px 6px',
          }}
        >
          <div
            className="text-[10px] tracking-[1.2px] uppercase"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
          >
            {counselorName || 'The Cabinet'}
          </div>
          {parseBlocks(content).map((block, bi) =>
            block.type === 'quote' ? (
              <div
                key={bi}
                className="pl-3 py-1 italic text-[14px] leading-relaxed"
                style={{
                  borderLeft: '3px solid rgba(201,168,76,0.5)',
                  fontFamily: 'var(--font-serif, Georgia, serif)',
                  color: '#c9a84c',
                }}
              >
                &ldquo;{block.content}&rdquo;
              </div>
            ) : (
              <p
                key={bi}
                className="text-[14px] leading-relaxed"
                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
              >
                {block.content}
              </p>
            )
          )}
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="self-start mt-1 text-[10px] tracking-[1.2px] uppercase hover:opacity-80"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
            >
              Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
