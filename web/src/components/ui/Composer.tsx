'use client';

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

/**
 * The chat input. Enter sends, Shift+Enter makes a newline — the behaviour
 * the cabinet page had inline in three places.
 */
export default function Composer({
  value,
  onChange,
  onSend,
  placeholder = 'Speak to your Cabinet…',
  disabled = false,
  maxLength,
}: ComposerProps) {
  const canSend = !disabled && value.trim().length > 0;

  return (
    <div
      className="px-4 py-3 flex gap-2 items-end flex-shrink-0"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(10,14,28,0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <textarea
        className="flex-1 px-4 py-3 text-[15px] leading-relaxed resize-none outline-none"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(201,168,76,0.15)',
          borderRadius: 22,
          color: '#e6eef8',
          fontFamily: 'var(--font-serif, Georgia, serif)',
        }}
        rows={2}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSend();
          }
        }}
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        aria-label="Send"
        className="flex items-center justify-center flex-shrink-0 w-11 h-11 rounded-full font-bold text-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }}
      >
        →
      </button>
    </div>
  );
}
