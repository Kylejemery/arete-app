// The Library's house palette and type, shared by the rooms and the reader.

export const SERIF = 'var(--font-cormorant), Georgia, serif';
export const SANS = 'var(--font-inter), system-ui, sans-serif';
export const MONO = 'var(--font-jetbrains), monospace';

export const GOLD = '#c9a84c';
export const GOLD_L = '#e3c77a';
export const IVORY = '#f4ead5';
export const TEXT = '#e8e4d6';
export const MUTED = '#8a8b8e';

// Lowercase and strip combining marks, so a query typed without accents still
// matches the text as catalogued (Laërtius, Montaigne, Zeno of Citium).
export const foldText = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
