import React from 'react';

const CATEGORY = ['stoics','warriors','athletes','builders','writers','spiritual'];
const LEVEL = ['direct','firm','gentle'];

export function Badge({ tone = 'stoics', children, style }) {
  let s;
  if (CATEGORY.includes(tone)) s = { background: 'var(--cat-' + tone + '-bg)', color: 'var(--cat-' + tone + '-fg)' };
  else if (LEVEL.includes(tone)) s = { background: 'var(--lvl-' + tone + '-bg)', color: 'var(--lvl-' + tone + '-fg)' };
  else if (tone === 'gold') s = { background: 'var(--gold)', color: '#0a1628', borderRadius: 'var(--r-xs)', fontSize: 9, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', padding: '2px 7px' };
  else if (tone === 'outline') s = { background: 'var(--gold-15)', border: '1px solid var(--gold-33)', color: 'var(--gold)', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '2px 7px' };
  else s = { background: '#222', color: 'var(--muted)', borderRadius: 'var(--r-chip)', padding: '3px 8px' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 'var(--r-sm)',
      fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
      ...s, ...style
    }}>{children}</span>
  );
}
