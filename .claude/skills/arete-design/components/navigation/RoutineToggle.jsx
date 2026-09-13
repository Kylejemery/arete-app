import React from 'react';

// The legacy morning/evening pair. These two pills are the one place emoji
// still appear as UI chrome; new screens should use Icon instead.
export function RoutineToggle({ value = 'evening', onChange, useEmoji = true, style }) {
  const items = [
    { key: 'morning', label: 'Morning', emoji: '\u2600\uFE0F' },
    { key: 'evening', label: 'Evening', emoji: '\uD83C\uDF19' }
  ];
  return (
    <div style={{ display: 'flex', gap: 10, ...style }}>
      {items.map(it => {
        const on = it.key === value;
        return (
          <div key={it.key} onClick={() => onChange && onChange(it.key)} style={{
            flex: 1, padding: 13, textAlign: 'center', borderRadius: 50, cursor: 'pointer',
            background: on ? 'var(--gold-09)' : 'var(--surface)',
            border: '1px solid ' + (on ? 'var(--gold)' : '#2a2a3e')
          }}>
            {useEmoji && <div style={{ fontSize: 18 }}>{it.emoji}</div>}
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase',
              color: on ? 'var(--gold)' : '#444'
            }}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}
