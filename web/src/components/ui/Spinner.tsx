'use client';

export interface SpinnerProps {
  size?: number;
  label?: string;
  className?: string;
}

/** The single loading indicator: a gold ring, optionally with a mono label. */
export default function Spinner({ size = 20, label, className = '' }: SpinnerProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`} role="status" aria-live="polite">
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '2px solid rgba(201,168,76,0.2)',
          borderTopColor: '#c9a84c',
          display: 'inline-block',
          animation: 'arete-spin 0.8s linear infinite',
        }}
      />
      {label && (
        <span
          className="text-[11px] tracking-[2px] uppercase"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
        >
          {label}
        </span>
      )}
      <style>{'@keyframes arete-spin { to { transform: rotate(360deg); } }'}</style>
    </span>
  );
}
