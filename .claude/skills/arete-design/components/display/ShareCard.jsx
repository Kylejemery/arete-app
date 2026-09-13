import React from 'react';

export function ShareCard({ quote, attribution, source = 'via the Cabinet', wordmark = 'ARETE', url = 'pursuearete.com', style }) {
  return (
    <div style={{
      width: 340, background: '#101a30', border: '1px solid var(--gold-33)',
      borderRadius: 'var(--r-sheet)', padding: '28px 24px', ...style
    }}>
      <div style={{ fontSize: 40, lineHeight: 1, color: 'var(--gold)' }}>&ldquo;</div>
      <div style={{ fontSize: 19, lineHeight: 1.5, color: '#e8e2cf', margin: '8px 0 18px' }}>{quote}</div>
      <div style={{ width: 40, height: 2, background: 'var(--gold)', marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)' }}>{attribution}</div>
      <div style={{ fontSize: 11, color: '#667', marginTop: 2 }}>{source}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26 }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '3px', color: 'var(--gold)' }}>{wordmark}</span>
        <span style={{ fontSize: 11, fontStyle: 'italic', color: '#556' }}>{url}</span>
      </div>
    </div>
  );
}
