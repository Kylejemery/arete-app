import React from 'react';
import { Icon } from '../icons/Icon.jsx';

export function SidePanel({ title = 'Arete', footer, onClose, children, style }) {
  return (
    <div style={{
      width: 300, background: 'var(--surface)', borderLeft: '1px solid var(--gold-20)',
      borderRadius: '0 var(--r-panel) var(--r-panel) 0', padding: 18,
      display: 'flex', flexDirection: 'column', ...style
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}>{title}</span>
        <span onClick={onClose} style={{ color: 'var(--muted)', cursor: 'pointer' }}><Icon name="close" /></span>
      </div>
      <div>{children}</div>
      {footer && <div style={{ textAlign: 'center', fontSize: 11, fontStyle: 'italic', color: 'var(--faint)', marginTop: 18 }}>{footer}</div>}
    </div>
  );
}
