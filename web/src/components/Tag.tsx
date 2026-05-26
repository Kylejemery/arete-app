import { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
  variant?: 'gold' | 'muted' | 'outline';
  className?: string;
}

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  gold: {
    background: 'rgba(201,168,76,0.15)',
    color: '#c9a84c',
    border: '1px solid rgba(201,168,76,0.30)',
  },
  muted: {
    background: 'rgba(255,255,255,0.06)',
    color: '#9aa0a6',
    border: '1px solid rgba(255,255,255,0.10)',
  },
  outline: {
    background: 'transparent',
    color: '#9aa0a6',
    border: '1px solid rgba(255,255,255,0.15)',
  },
};

export default function Tag({ children, variant = 'muted', className = '' }: TagProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] ${className}`}
      style={{
        ...VARIANT_STYLES[variant],
        fontFamily: 'var(--font-mono, monospace)',
      }}
    >
      {children}
    </span>
  );
}
