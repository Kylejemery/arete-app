import React from 'react';

export function ScreenHeader({ title, subtitle, smallCaps, right, divider, style }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingBottom: divider ? 14 : 0,
      borderBottom: divider ? '1px solid var(--gold-13)' : undefined, ...style
    }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--gold)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</div>}
        {smallCaps && <div style={{
          fontSize: 11, color: 'var(--gold-60)', fontVariant: 'small-caps',
          letterSpacing: '0.5px', marginTop: 4
        }}>{smallCaps}</div>}
      </div>
      {right}
    </div>
  );
}
