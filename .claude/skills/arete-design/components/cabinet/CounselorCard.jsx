import React from 'react';
import { Badge } from '../display/Badge.jsx';
import { Icon } from '../icons/Icon.jsx';

export function CounselorCard({ name, category, level, blurb, selected, locked, alwaysPresent, onClick, style }) {
  return (
    <div onClick={locked ? undefined : onClick} style={{
      position: 'relative', width: 230, background: 'var(--surface)',
      border: selected ? '2px solid var(--gold)' : '1px solid ' + (locked ? 'var(--border-dim)' : 'var(--border)'),
      borderRadius: 'var(--r-card)', padding: 14,
      opacity: locked ? 0.55 : 1,
      cursor: locked || !onClick ? 'default' : 'pointer', ...style
    }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {category && <Badge tone={category}>{category}</Badge>}
        {level && <Badge tone={level}>{level}</Badge>}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-body)', marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 13, lineHeight: '18px', color: 'var(--muted)' }}>{blurb}</div>
      {alwaysPresent && <div style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600, marginTop: 8 }}>Always Present</div>}
      {selected && !alwaysPresent && (
        <div style={{ position: 'absolute', bottom: 10, right: 14, color: 'var(--gold)', fontSize: 18, fontWeight: 700 }}>&#10003;</div>
      )}
      {locked && (
        <div style={{ position: 'absolute', bottom: 10, right: 14 }}>
          <Badge tone="locked"><Icon name="lockClosed" size={12} /> Arete</Badge>
        </div>
      )}
    </div>
  );
}
