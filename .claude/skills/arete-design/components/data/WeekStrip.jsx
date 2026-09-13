import React from 'react';
import { Card } from '../display/Card.jsx';
import { Kicker } from '../display/Kicker.jsx';

const Dot = ({ on, color }) => (
  <span style={{ width: 8, height: 8, borderRadius: 4, background: on ? color : '#333' }} />
);

export function WeekStrip({ label = 'This week', days, style }) {
  return (
    <Card border="hairline" style={style}>
      <Kicker style={{ marginBottom: 12 }}>{label}</Kicker>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {days.map((d, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.letter}</div>
            <div style={{ fontSize: 13, fontWeight: d.today ? 700 : 600, color: d.today ? 'var(--gold)' : 'var(--text)' }}>{d.date}</div>
            <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 4 }}>
              <Dot on={d.morning} color="var(--gold)" />
              <Dot on={d.evening} color="var(--evening)" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
