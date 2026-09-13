import React from 'react';
import { Icon } from '../icons/Icon.jsx';

export function SearchBar({ placeholder = 'Search entries', value, onChange, style }) {
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center', background: 'var(--surface)',
      border: '1px solid var(--gold-13)', borderRadius: 'var(--r-card)',
      padding: 10, color: 'var(--muted)', fontSize: 14, ...style
    }}>
      <Icon name="search" size={16} color="var(--muted)" />
      <input value={value} onChange={onChange} placeholder={placeholder} style={{
        flex: 1, background: 'none', border: 'none', outline: 'none',
        color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-sans)'
      }} />
    </div>
  );
}
