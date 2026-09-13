import React from 'react';

export function ProgressBar({ value, label, showPercent = true, style }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={style}>
      {(label || showPercent) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{label}</span>
          {showPercent && <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)' }}>{pct}%</span>}
        </div>
      )}
      <div style={{ height: 12, borderRadius: 10, background: 'var(--surface-deep)', overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: 'var(--gold)', borderRadius: 10 }} />
      </div>
    </div>
  );
}
