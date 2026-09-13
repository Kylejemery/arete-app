import React from 'react';

export function TypingIndicator({ speaker, style }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', ...style }}>
      <div style={{
        width: 16, height: 16, borderRadius: 8,
        border: '2px solid var(--gold)', borderRightColor: 'transparent'
      }} />
      <span style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--muted)' }}>{speaker} is considering...</span>
    </div>
  );
}
