import React from 'react';
import { Icon } from '../icons/Icon.jsx';

export const ARETE_TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'morning', label: 'Morning', icon: 'sunny' },
  { key: 'evening', label: 'Evening', icon: 'moon' },
  { key: 'cabinet', label: 'Cabinet', icon: 'mic' },
  { key: 'journal', label: 'Journal', icon: 'book' },
  { key: 'focus', label: 'Focus', icon: 'library' },
  { key: 'scrolls', label: 'Scrolls', icon: 'newspaper' },
  { key: 'progress', label: 'Progress', icon: 'trophy' }
];

export function TabBar({ tabs = ARETE_TABS, value, onChange, style }) {
  return (
    <div style={{
      height: 60, background: 'var(--bg)', display: 'flex', alignItems: 'center',
      justifyContent: 'space-around', paddingBottom: 5, flex: 'none', ...style
    }}>
      {tabs.map(t => {
        const on = t.key === value;
        return (
          <div key={t.key} onClick={() => onChange && onChange(t.key)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            fontSize: 9, color: on ? 'var(--gold)' : 'gray', cursor: 'pointer'
          }}>
            <Icon name={t.icon} size={22} strokeWidth={1.7} />
            <span>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}
