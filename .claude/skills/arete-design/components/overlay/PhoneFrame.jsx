import React from 'react';

// The 375px device shell the previews and UI kits are composed inside.
export function PhoneFrame({ children, minHeight = 640, style }) {
  return (
    <div style={{
      width: 375, minHeight, background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'var(--font-sans)', borderRadius: 'var(--r-phone)',
      border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
      position: 'relative', display: 'flex', flexDirection: 'column', ...style
    }}>{children}</div>
  );
}
