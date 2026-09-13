import React from 'react';
import { Card } from './Card.jsx';

export function QuoteCard({ quote, attribution, glyph = true, icon, style }) {
  return (
    <Card border="hairline" accentRule padding={20} style={{ display: 'flex', gap: 12, ...style }}>
      {icon ? <span style={{ color: 'var(--gold)' }}>{icon}</span> : glyph ? (
        <div style={{ fontSize: 44, lineHeight: '44px', color: 'var(--gold)', fontWeight: 700, marginTop: -4 }}>&ldquo;</div>
      ) : null}
      <div>
        <div style={{ fontSize: 14, fontStyle: 'italic', lineHeight: '22px', color: icon ? 'var(--gold)' : 'var(--text-quote)' }}>{quote}</div>
        {attribution && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginTop: 8 }}>{attribution}</div>}
      </div>
    </Card>
  );
}
