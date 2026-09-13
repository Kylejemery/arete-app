import React from 'react';

export function UnderlineTabs({ items, value, onChange, style }) {
  return (
    <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--gold-13)', ...style }}>
      {items.map(it => {
        const on = it === value;
        return (
          <div key={it} onClick={() => onChange && onChange(it)} style={{
            flex: 1, textAlign: 'center', padding: 12,
            color: on ? 'var(--gold)' : 'var(--muted)',
            borderBottom: '2px solid ' + (on ? 'var(--gold)' : 'transparent'),
            fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}>{it}</div>
        );
      })}
    </div>
  );
}
