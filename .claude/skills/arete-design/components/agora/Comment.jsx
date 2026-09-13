import React from 'react';
import { Kicker } from '../display/Kicker.jsx';

// Flat comment under an essay. A counselor's comment is marked with a gold
// kicker and the accent rule; a reader's is plain with a name in gold.
export function Comment({ author, time, children, counselor, style }) {
  return (
    <div style={{
      paddingLeft: counselor ? 14 : 0,
      borderLeft: counselor ? '3px solid var(--gold)' : 'none', ...style
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        {counselor
          ? <Kicker style={{ letterSpacing: '0.5px' }}>{author}</Kicker>
          : <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{author}</span>}
        <span style={{ fontSize: 11, color: 'var(--faint)' }}>{time}</span>
      </div>
      <div style={{
        fontSize: 14, lineHeight: '22px',
        color: counselor ? 'var(--text-quote)' : 'var(--text-soft)',
        fontStyle: counselor ? 'italic' : 'normal'
      }}>{children}</div>
    </div>
  );
}
