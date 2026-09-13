import React from 'react';

// The signature Arete label: tiny, bold, uppercase, tracked, gold.
export function Kicker({ variant = 'kicker', dim, as = 'div', children, style }) {
  const Tag = as;
  const eyebrow = variant === 'eyebrow';
  return (
    <Tag style={{
      fontSize: eyebrow ? 11 : 10,
      letterSpacing: eyebrow ? '3px' : '1.2px',
      textTransform: 'uppercase',
      fontWeight: 700,
      color: dim ? 'var(--gold-53)' : 'var(--gold)',
      ...style
    }}>{children}</Tag>
  );
}
