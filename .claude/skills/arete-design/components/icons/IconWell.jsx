import React from 'react';
import { Icon } from './Icon.jsx';

// Circular gold well: 38-48px, 8-15% gold fill, 20-30% gold hairline.
export function IconWell({ name, size = 44, tint = 'strong', children, style }) {
  const strong = tint === 'strong';
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2, flex: 'none',
      background: strong ? 'var(--gold-15)' : 'var(--gold-08)',
      border: '1px solid ' + (strong ? 'var(--gold-30)' : 'var(--gold-20)'),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--gold)', fontSize: 16, fontWeight: 700, ...style
    }}>
      {name ? <Icon name={name} size={18} /> : children}
    </div>
  );
}
