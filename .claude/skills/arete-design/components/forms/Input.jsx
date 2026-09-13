import React from 'react';

export function Input({ multiline, rows = 3, style, ...rest }) {
  const s = {
    background: 'var(--surface-input)', border: '1px solid var(--gold-20)',
    borderRadius: 'var(--r-card)', padding: '12px 16px', color: 'var(--text)',
    fontSize: 16, fontFamily: 'var(--font-sans)', width: '100%',
    boxSizing: 'border-box', outline: 'none', ...style
  };
  return multiline ? <textarea rows={rows} style={{ ...s, resize: 'none', lineHeight: '22px' }} {...rest} />
    : <input style={s} {...rest} />;
}
