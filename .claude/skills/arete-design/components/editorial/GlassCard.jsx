import React from 'react';

// Web app v2 surface: 4% white, 8% white border, 12px backdrop blur.
export function GlassCard({ tint, children, style }) {
  return (
    <div style={{
      background: tint === 'gold' ? 'var(--gold-15)' : 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 'var(--r-panel)', padding: 16,
      backdropFilter: tint === 'gold' ? undefined : 'blur(12px)', ...style
    }}>{children}</div>
  );
}
