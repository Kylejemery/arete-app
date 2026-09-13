import React from 'react';

// Academy idiom: 2px radius on navy, Playfair title, tracked gold kickers.
export function EssayIndexCard({ kicker, title, author, meta, excerpt, tags = [], onClick, style }) {
  return (
    <div onClick={onClick} style={{
      background: '#111d30', border: '1px solid #1e3258', borderRadius: 'var(--r-academy)',
      padding: 24, cursor: onClick ? 'pointer' : undefined, ...style
    }}>
      {kicker && <div style={{
        fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase',
        color: 'var(--gold-70)', marginBottom: 10
      }}>{kicker}</div>}
      <div style={{
        fontFamily: 'var(--font-serif-academy)', fontSize: 22, color: '#f5edd6',
        lineHeight: 1.25, marginBottom: 8
      }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: '0.3px' }}>
        {author}{meta ? <span style={{ color: '#7a8fa6' }}> · {meta}</span> : null}
      </div>
      {excerpt && <div style={{ fontSize: 14, lineHeight: 1.6, color: '#e8d9b0', marginTop: 12 }}>{excerpt}</div>}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
          {tags.map(t => (
            <span key={t} style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '1.2px',
              textTransform: 'uppercase', color: 'var(--gold-53)'
            }}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
