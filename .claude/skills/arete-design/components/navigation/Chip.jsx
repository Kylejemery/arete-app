import React from 'react';

export function Chip({ active, children, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 20,
      background: active ? 'var(--gold-20)' : 'var(--surface)',
      border: '1px solid ' + (active ? 'var(--gold)' : 'var(--gold-13)'),
      color: active ? 'var(--gold)' : 'var(--muted)',
      fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
      cursor: 'pointer', ...style
    }}>{children}</button>
  );
}
