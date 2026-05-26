import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** Adds a 4px gold left-border accent */
  accent?: boolean;
}

export default function GlassCard({ children, className = '', accent = false }: GlassCardProps) {
  return (
    <div
      className={`rounded-xl ${accent ? 'border-l-[4px]' : ''} ${className}`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: accent
          ? '1px solid rgba(255,255,255,0.08)'
          : '1px solid rgba(255,255,255,0.08)',
        borderLeft: accent ? '4px solid #c9a84c' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {children}
    </div>
  );
}
