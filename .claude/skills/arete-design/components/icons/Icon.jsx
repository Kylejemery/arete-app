import React from 'react';

// Glyph paths lifted verbatim from the shipped Arete previews (Ionicons-outline
// equivalents drawn as inline SVG). Filled glyphs are state-only: flame, lock.
export const areteGlyphs = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  sunny: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  mic: 'M5 11a7 7 0 0 0 14 0M12 18v3',
  book: 'M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z',
  library: 'M4 4h3v16H4zM9 4h3v16H9zM14 5l3-1 4 15-3 1z',
  newspaper: 'M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h6M7 13h6',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8',
  send: 'M3 11l18-8-7 18-3-7z',
  checkmark: 'M5 12l4 4 10-10',
  add: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  chevronForward: 'M9 6l6 6-6 6',
  search: 'M20 20l-4.5-4.5',
  flame: 'M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z',
  lockClosed: 'M7 10V8a5 5 0 0 1 10 0v2h1v11H6V10zm2 0h6V8a3 3 0 0 0-6 0z'
};

const EXTRA = {
  sunny: <circle cx="12" cy="12" r="4" />,
  mic: <rect x="9" y="3" width="6" height="11" rx="3" />,
  search: <circle cx="11" cy="11" r="6" />
};

const FILLED = ['flame', 'lockClosed'];

export function Icon({ name, size = 18, strokeWidth = 1.8, filled, color = 'currentColor', style, ...rest }) {
  const isFilled = filled ?? FILLED.includes(name);
  const d = areteGlyphs[name];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"
      style={{ display: 'block', flex: 'none', ...style }}
      fill={isFilled ? color : 'none'}
      stroke={isFilled ? 'none' : color}
      strokeWidth={isFilled ? 0 : strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {EXTRA[name]}
      <path d={d} />
    </svg>
  );
}
