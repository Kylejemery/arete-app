import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'academy-bg':      '#0a0e23',
        'academy-surface': '#0f1530',
        'academy-card':    '#141b38',
        'academy-gold':    '#d4a84b',
        'academy-gold-dim':'#a07830',
        'academy-text':    '#e8e4d8',
        'academy-muted':   '#8a8070',
        'academy-border':  '#1e2847',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Caladea', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
