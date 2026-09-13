import React from 'react';

const SIZES = {
  lg: { padding: '16px 24px', fontSize: 17, borderRadius: 'var(--r-card-lg)' },
  md: { padding: '11px 18px', fontSize: 14, borderRadius: 'var(--r-btn)' },
  sm: { padding: '8px 18px', fontSize: 13, borderRadius: 'var(--r-btn)' },
  pill: { padding: '7px 14px', fontSize: 10, borderRadius: 'var(--r-pill)', letterSpacing: '1.2px', textTransform: 'uppercase' }
};

const VARIANTS = {
  primary: { background: 'var(--gold)', color: 'var(--bg)', border: 'none' },
  secondary: { background: 'var(--gold-13)', color: 'var(--gold)', border: '1px solid var(--gold-53)' },
  ghost: { background: 'transparent', color: 'var(--muted)', border: 'none', fontWeight: 600 },
  danger: { background: 'var(--danger)', color: '#fff', border: 'none' },
  dashed: { background: 'transparent', color: 'var(--gold)', border: '1px dashed var(--gold-27)', fontWeight: 600, fontSize: 15, padding: 16 }
};

export function Button({ variant = 'primary', size = 'lg', disabled, fullWidth, icon, children, style, ...rest }) {
  const s = variant === 'dashed' ? {} : SIZES[size] || SIZES.lg;
  return (
    <button disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: 'var(--font-sans)', fontWeight: 700, letterSpacing: '0.2px',
      cursor: disabled ? 'default' : 'pointer',
      width: fullWidth || variant === 'dashed' ? '100%' : undefined,
      opacity: disabled ? 0.5 : 1,
      ...s, ...VARIANTS[variant], ...style
    }} {...rest}>
      {icon}{children}
    </button>
  );
}
