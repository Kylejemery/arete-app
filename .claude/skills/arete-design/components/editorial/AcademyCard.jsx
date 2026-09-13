import React from 'react';

export function AcademyCard({ kicker, title, children, style }) {
  return (
    <div style={{
      background: '#111d30', border: '1px solid #1e3258',
      borderRadius: 'var(--r-academy)', padding: 20, ...style
    }}>
      {kicker && <div style={{
        fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase',
        color: 'var(--gold-70)', marginBottom: 8
      }}>{kicker}</div>}
      {title && <div style={{
        fontFamily: 'var(--font-serif-academy)', fontSize: 18, color: '#f5edd6'
      }}>{title}</div>}
      {children}
    </div>
  );
}
