import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Landing / waitlist tokens (editorial dark-academic style)
        navy:          '#0A1628',
        'navy-light':  '#0F1E38',
        'navy-card':   '#111D30',
        'navy-border': '#1E3258',
        gold:          '#C9A84C',
        'gold-dim':    '#9A7A32',
        cream:         '#F5EDD6',
        parchment:     '#E8D9B0',
        // academy-* aliases used throughout dashboard components
        'academy-bg':      '#0A1628',
        'academy-surface': '#0F1E38',
        'academy-card':    '#111D30',
        'academy-border':  '#1E3258',
        'academy-gold':    '#C9A84C',
        'academy-text':    '#F5EDD6',
        'academy-muted':   '#7A8FA6',
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans:  ['var(--font-inter)',    'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
