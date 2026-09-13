import React from 'react';
import { Card } from '../display/Card.jsx';
import { Kicker } from '../display/Kicker.jsx';

// Every essay is read before it appears. This states that plainly.
export function SubmissionNotice({ state = 'pending', note, style }) {
  const copy = {
    draft: ['Draft', 'Only you can see this. Nothing is sent until you submit it.'],
    pending: ['In review', 'Submitted. An editor reads every essay before it appears in the Agora.'],
    published: ['Published', 'Live in the Agora. Comments are open to subscribers.'],
    returned: ['Returned', 'Sent back with notes. Edit and submit again whenever you are ready.']
  }[state];
  return (
    <Card border={state === 'published' ? 'card' : 'hairline'} accentRule padding={16} style={style}>
      <Kicker dim={state === 'draft'}>{copy[0]}</Kicker>
      <div style={{ fontSize: 14, lineHeight: '21px', color: 'var(--text-soft)', marginTop: 6 }}>{note || copy[1]}</div>
    </Card>
  );
}
