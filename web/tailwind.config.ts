import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'arete-bg': '#0f1724',
        'arete-surface': '#1a1a2e',
        'arete-gold': '#c9a84c',
        'arete-text': '#e6eef8',
        'arete-muted': '#9aa0a6',
        'arete-border': '#2a3a5c',
      },
    },
  },
  plugins: [],
};

export default config;
