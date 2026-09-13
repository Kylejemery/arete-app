import React from 'react';

export function AcademyButton({ variant = 'solid', children, style, ...rest }) {
  const solid = variant === 'solid';
  return (
    <button style={{
      background: solid ? 'var(--gold)' : 'transparent',
      color: solid ? '#0a1628' : 'var(--gold)',
      border: solid ? 'none' : '1px solid var(--gold)',
      borderRadius: 0, padding: '12px 28px',
      fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 12,
      letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', ...style
    }} {...rest}>{children}</button>
  );
}
