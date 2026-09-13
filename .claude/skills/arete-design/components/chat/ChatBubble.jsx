import React from 'react';
import { Kicker } from '../display/Kicker.jsx';

export function ChatBubble({ from = 'counselor', speaker, children, style }) {
  const user = from === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: user ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: user ? '80%' : '85%',
        background: user ? 'var(--gold-15)' : 'var(--surface)',
        border: '1px solid ' + (user ? 'var(--gold)' : 'var(--gold-20)'),
        borderRadius: 'var(--r-panel)',
        borderBottomRightRadius: user ? 4 : undefined,
        borderBottomLeftRadius: user ? undefined : 4,
        padding: 14, ...style
      }}>
        {!user && speaker && <Kicker style={{ letterSpacing: '0.5px', marginBottom: 6 }}>{speaker}</Kicker>}
        <div style={{
          fontSize: 15,
          lineHeight: user ? '22px' : '24px',
          color: user ? 'var(--text)' : 'var(--text-body)'
        }}>{children}</div>
      </div>
    </div>
  );
}
