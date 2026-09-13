import React from 'react';
import { Card } from '../display/Card.jsx';
import { Icon } from '../icons/Icon.jsx';

export function TaskRow({ title, note, done, onToggle, style }) {
  return (
    <Card done={done} padding={18} onClick={onToggle}
      style={{ display: 'flex', gap: 14, alignItems: 'center', cursor: onToggle ? 'pointer' : undefined, ...style }}>
      {done ? (
        <div style={{
          width: 22, height: 22, borderRadius: 11, flex: 'none', background: 'var(--bg)', color: 'var(--gold)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}><Icon name="checkmark" size={14} /></div>
      ) : (
        <div style={{ width: 22, height: 22, borderRadius: 11, flex: 'none', border: '2px solid var(--gold-40)' }} />
      )}
      <div>
        <div style={{
          fontSize: 16, fontWeight: done ? 700 : 400,
          color: done ? 'var(--bg)' : undefined,
          textDecoration: done ? 'line-through' : 'none'
        }}>{title}</div>
        {note && !done && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{note}</div>}
      </div>
    </Card>
  );
}
