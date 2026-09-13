import React from 'react';
import { Icon } from '../icons/Icon.jsx';

export function StreakPill({ count, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: 'var(--gold-13)', border: '1px solid var(--gold-33)',
      borderRadius: 20, padding: '5px 12px',
      fontSize: 14, fontWeight: 700, color: 'var(--gold)', ...style
    }}><Icon name="flame" size={14} /> {count}</span>
  );
}
