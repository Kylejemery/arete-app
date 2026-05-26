import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Legacy tokens (keep — used throughout existing pages) ──
        'arete-bg':      '#0f1724',
        'arete-surface': '#1a1a2e',
        'arete-gold':    '#c9a84c',
        'arete-text':    '#e6eef8',
        'arete-muted':   '#9aa0a6',
        'arete-border':  '#2a3a5c',
        // ── v2 tokens ─────────────────────────────────────────────
        'v2-bg':         '#0f1724',
        'v2-gold':       '#c9a84c',
        'v2-text':       '#e6eef8',
        'v2-muted':      '#9aa0a6',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans:  ['var(--font-sans)',  'system-ui', 'sans-serif'],
        mono:  ['var(--font-mono)',  'monospace'],
      },
      borderColor: {
        line: 'rgba(255,255,255,0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
