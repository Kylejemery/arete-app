'use client';

export interface UserBubbleProps {
  content: string;
  /** Shown above the bubble in a shared session. */
  senderName?: string;
}

export default function UserBubble({ content, senderName }: UserBubbleProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] flex flex-col items-end gap-1">
        {senderName && (
          <span
            className="text-[10px] tracking-[1.2px] uppercase"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
          >
            {senderName}
          </span>
        )}
        <div
          className="px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap"
          style={{
            background: 'rgba(201,168,76,0.12)',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: '18px 18px 6px 18px',
            fontFamily: 'var(--font-serif, Georgia, serif)',
            color: '#e6eef8',
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
