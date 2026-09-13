import React from 'react';
import { Card } from './Card.jsx';

export function DispatchCard({ from, time, title, body, action = 'Read more', onClick, style }) {
  return (
    <Card background="var(--surface-raised)" border="card" onClick={onClick}
      style={{ borderColor: 'var(--gold-33)', cursor: onClick ? 'pointer' : undefined, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--gold)' }}>{from}</span>
        <span style={{ fontSize: 11, color: 'var(--faint)' }}>{time}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: '22px', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14, lineHeight: '21px', color: 'var(--text-soft)' }}>{body}</div>
      {action && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', textAlign: 'right', marginTop: 10 }}>{action}</div>}
    </Card>
  );
}
