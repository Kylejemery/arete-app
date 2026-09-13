import React from 'react';
import { Card } from '../display/Card.jsx';
import { Icon } from '../icons/Icon.jsx';

// An essay in the Agora list. Author is a name only: the system has no avatars.
export function EssayRow({ title, author, meta, excerpt, tags = [], comments, counselor, onClick, style }) {
  return (
    <Card border="hairline" padding={16} onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined, ...style }}>
      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: '22px', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginBottom: 8 }}>
        {author}{meta ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {meta}</span> : null}
      </div>
      {excerpt && <div style={{ fontSize: 14, lineHeight: '21px', color: 'var(--text-soft)', marginBottom: 10 }}>{excerpt}</div>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {tags.map(t => (
          <span key={t} style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
            color: 'var(--gold-53)'
          }}>{t}</span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
          <Icon name="book" size={14} color="var(--muted)" />{comments}
        </span>
      </div>
      {counselor && (
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--gold)', marginTop: 10 }}>
          {counselor} answered
        </div>
      )}
    </Card>
  );
}
