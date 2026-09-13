import React from 'react';
import { IconWell } from '../icons/IconWell.jsx';

export function MenuRow({ icon, title, subtitle, onClick, last, style }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', gap: 12, alignItems: 'center', padding: '14px 0',
      borderBottom: last ? 'none' : '1px solid var(--divider)',
      cursor: onClick ? 'pointer' : undefined, ...style
    }}>
      <IconWell name={icon} size={40} tint="soft" />
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-warm)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: '17px', marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
  );
}
