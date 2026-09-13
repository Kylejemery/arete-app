import React from 'react';
import { Card } from './Card.jsx';

export function ReflectionCard({ label = 'Reflection', date, prompt, body, style }) {
  return (
    <Card border="hairline" padding={16} style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--faint)' }}>{date}</span>
      </div>
      {prompt && <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--muted)', lineHeight: '20px', marginBottom: 6 }}>{prompt}</div>}
      <div style={{ fontSize: 14, lineHeight: '22px', color: 'var(--text-soft)' }}>{body}</div>
    </Card>
  );
}
