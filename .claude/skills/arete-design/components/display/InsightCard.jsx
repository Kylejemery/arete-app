import React from 'react';

export function InsightCard({ label, body, style }) {
  return (
    <div style={{
      background: 'var(--insight-surface)', border: '1px solid var(--insight-border)',
      borderRadius: 'var(--r-card-lg)', padding: 16, ...style
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, fontStyle: 'italic', color: 'var(--insight)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, lineHeight: '22px', color: 'var(--text-soft)' }}>{body}</div>
    </div>
  );
}
