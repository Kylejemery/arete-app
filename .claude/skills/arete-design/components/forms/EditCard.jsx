import React from 'react';
import { Card } from '../display/Card.jsx';
import { Button } from '../actions/Button.jsx';

export function EditCard({ value, placeholder, onChange, onCancel, onConfirm, confirmLabel = 'Add', style }) {
  return (
    <Card border="selected" padding={16} style={{ borderWidth: 1, ...style }}>
      <input value={value} placeholder={placeholder} onChange={onChange} autoFocus style={{
        width: '100%', background: 'none', border: 'none', outline: 'none',
        fontSize: 16, color: 'var(--text)', fontFamily: 'var(--font-sans)',
        paddingBottom: 8, borderBottom: '1px solid var(--gold-20)', marginBottom: 12
      }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Card>
  );
}
