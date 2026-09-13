import React from 'react';

export function SegmentedTabs({ items, value, onChange, style }) {
  return (
    <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 'var(--r-card)', padding: 4, ...style }}>
      {items.map(it => {
        const on = it === value;
        return (
          <div key={it} onClick={() => onChange && onChange(it)} style={{
            flex: 1, textAlign: 'center', padding: 10, borderRadius: 'var(--r-btn)',
            background: on ? 'var(--gold)' : 'transparent',
            color: on ? 'var(--bg)' : 'var(--muted)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}>{it}</div>
        );
      })}
    </div>
  );
}
