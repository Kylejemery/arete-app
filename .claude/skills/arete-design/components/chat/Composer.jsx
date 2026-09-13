import React from 'react';
import { IconButton } from '../actions/IconButton.jsx';
import { Icon } from '../icons/Icon.jsx';

export function Composer({ value, placeholder = 'Speak to your cabinet', onChange, onSend, disabled, style }) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--surface)',
      borderTop: '1px solid var(--gold-13)', padding: '12px 12px 16px', ...style
    }}>
      <input value={value} onChange={onChange} placeholder={placeholder}
        onKeyDown={e => { if (e.key === 'Enter' && onSend) onSend(); }}
        style={{
          flex: 1, background: 'var(--bg)', border: '1px solid var(--gold-20)',
          borderRadius: 20, padding: '10px 16px', fontSize: 15, color: 'var(--text)',
          fontFamily: 'var(--font-sans)', outline: 'none'
        }} />
      <IconButton variant="gold" disabled={disabled} onClick={onSend}><Icon name="send" /></IconButton>
    </div>
  );
}
