import React from 'react';
import { Card } from '../display/Card.jsx';
import { IconWell } from '../icons/IconWell.jsx';
import { Icon } from '../icons/Icon.jsx';

export function CounselorRow({ name, meta, initial, onClick, style }) {
  return (
    <Card border="hairline" padding={16} onClick={onClick}
      style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: onClick ? 'pointer' : undefined, ...style }}>
      <IconWell size={48}>{initial || String(name)[0]}</IconWell>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-body)' }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{meta}</div>
      </div>
      <Icon name="chevronForward" color="var(--faint)" />
    </Card>
  );
}
