import React from 'react';

// Three idioms in the app: a 56px gold FAB, a 40px gold send button,
// and a surface-with-hairline header button.
export function IconButton({ variant = 'surface', size = 40, disabled, children, style, ...rest }) {
  const v = disabled
    ? { background: 'var(--surface)', border: '1px solid var(--faint)', color: 'var(--faint)' }
    : variant === 'gold'
      ? { background: 'var(--gold)', border: 'none', color: 'var(--bg)' }
      : { background: 'var(--surface)', border: '1px solid var(--gold-20)', color: 'var(--gold)' };
  const square = variant === 'header';
  return (
    <button disabled={disabled} style={{
      width: size, height: size, padding: 0,
      borderRadius: square ? 'var(--r-card)' : size / 2,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: disabled ? 'default' : 'pointer', flex: 'none', ...v, ...style
    }} {...rest}>{children}</button>
  );
}
