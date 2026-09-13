import React from 'react';
import { Button } from '../actions/Button.jsx';
import { Input } from '../forms/Input.jsx';
import { Icon } from '../icons/Icon.jsx';

// Reading the Agora is free; commenting is a subscriber affordance.
export function CommentComposer({ value, onChange, onSubmit, locked, onUnlock, placeholder = 'Say the true thing plainly.', style }) {
  if (locked) {
    return (
      <div onClick={onUnlock} style={{
        display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface)',
        border: '1px dashed var(--gold-27)', borderRadius: 'var(--r-card)',
        padding: 16, cursor: 'pointer', ...style
      }}>
        <Icon name="lockClosed" size={16} color="var(--gold)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold)' }}>Commenting is for subscribers</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: '17px', marginTop: 2 }}>Reading the Agora is free. Writing in it is not.</div>
        </div>
        <Icon name="chevronForward" size={16} color="var(--muted)" />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      <Input multiline rows={3} value={value} onChange={onChange} placeholder={placeholder} />
      <Button size="md" style={{ alignSelf: 'flex-end' }} onClick={onSubmit}>Post</Button>
    </div>
  );
}
