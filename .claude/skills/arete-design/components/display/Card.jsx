import React from 'react';

// Flat surface, gold hairline, no shadow. Emphasis = accent rule, gold border, or inversion.
export function Card({ border = 'card', accentRule, done, padding = 16, radius = 'var(--r-card-lg)', background, children, style, ...rest }) {
  const borders = {
    card: '1px solid var(--gold-20)',
    hairline: '1px solid var(--gold-13)',
    selected: '2px solid var(--gold)',
    plain: '1px solid var(--border)',
    dim: '1px solid var(--border-dim)'
  };
  return (
    <div style={{
      background: done ? 'var(--gold)' : background || 'var(--surface)',
      border: done ? '1px solid var(--gold)' : borders[border],
      borderLeft: accentRule ? '3px solid var(--gold)' : undefined,
      borderRadius: radius, padding,
      color: done ? 'var(--bg)' : undefined,
      ...style
    }} {...rest}>{children}</div>
  );
}
