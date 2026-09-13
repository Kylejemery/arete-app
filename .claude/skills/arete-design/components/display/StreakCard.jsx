import React from 'react';
import { Card } from './Card.jsx';

export function StreakCard({ count, label = 'day streak', note = 'Keep the chain unbroken', style }) {
  return (
    <Card padding={24} style={{ display: 'flex', gap: 16, alignItems: 'center', ...style }}>
      <div style={{ fontSize: 52, fontWeight: 700, color: 'var(--gold)', lineHeight: '56px' }}>{count}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{label}</div>
        {note && <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic', marginTop: 3 }}>{note}</div>}
      </div>
    </Card>
  );
}
