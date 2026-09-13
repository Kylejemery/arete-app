import React from 'react';
import { Card } from './Card.jsx';

export function StatTile({ value, label, style }) {
  return (
    <Card border="hairline" padding={14} style={{ flex: 1, textAlign: 'center', ...style }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: '16px' }}>{label}</div>
    </Card>
  );
}
