import React from 'react';

export function BottomSheet({ title, subtitle, children, style }) {
  return (
    <div style={{ background: 'var(--scrim-sheet)', paddingTop: 40, overflow: 'hidden', ...style }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-sheet) var(--r-sheet) 0 0',
        padding: 20, display: 'flex', flexDirection: 'column', gap: 12
      }}>
        {title && <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>{title}</div>}
        {subtitle && <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: -6 }}>{subtitle}</div>}
        {children}
      </div>
    </div>
  );
}
