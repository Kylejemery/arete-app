import React from 'react';
import { Card } from './Card.jsx';
import { Kicker } from './Kicker.jsx';
import { Icon } from '../icons/Icon.jsx';

export function PromptCard({ label = "Today's question", question, attribution, onClick, style }) {
  return (
    <Card accentRule padding={20} onClick={onClick}
      style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: onClick ? 'pointer' : undefined, ...style }}>
      <div style={{ flex: 1 }}>
        <Kicker dim>{label}</Kicker>
        <div style={{ fontSize: 15, lineHeight: '22px', marginTop: 6 }}>{question}</div>
        {attribution && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)', marginTop: 4 }}>{attribution}</div>}
      </div>
      <Icon name="chevronForward" color="var(--muted)" />
    </Card>
  );
}
