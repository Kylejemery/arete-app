import React from 'react';

export function CabinetPill({ active, children, onClick, style }) {
  return (
    <span onClick={onClick} style={{
      border: '1px solid ' + (active ? 'var(--gold)' : 'var(--gold-20)'),
      background: active ? 'rgba(201,168,76,0.1)' : 'var(--bg)',
      borderRadius: 20, padding: '7px 14px', fontSize: 13,
      fontWeight: active ? 600 : 500,
      color: active ? 'var(--gold)' : 'var(--text-body)',
      cursor: onClick ? 'pointer' : undefined, ...style
    }}>{children}</span>
  );
}
