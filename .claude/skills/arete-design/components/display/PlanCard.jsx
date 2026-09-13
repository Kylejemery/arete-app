import React from 'react';

export function PlanCard({ name, note, price, period, badge, selected, onClick, style }) {
  return (
    <div onClick={onClick} style={{
      background: '#0f1e38',
      border: '1px solid ' + (selected ? 'var(--gold-33)' : '#1e3050'),
      borderRadius: 'var(--r-card-lg)', padding: 16,
      cursor: onClick ? 'pointer' : undefined, ...style
    }}>
      {badge && <span style={{
        display: 'inline-block', background: 'var(--gold)', color: '#0a1628',
        borderRadius: 'var(--r-xs)', padding: '2px 7px', fontSize: 9,
        fontWeight: 800, letterSpacing: '1px', marginBottom: 10, textTransform: 'uppercase'
      }}>{badge}</span>}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#e8edf5' }}>{name}</div>
          <div style={{ fontSize: 12, color: '#8a9bb0', lineHeight: '17px' }}>{note}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#e8edf5' }}>{price}</div>
          <div style={{ fontSize: 11, color: '#8a9bb0' }}>{period}</div>
        </div>
      </div>
    </div>
  );
}
