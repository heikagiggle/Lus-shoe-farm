import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: '#C71585', dark: '#A31069', soft: '#FBE9F4' } },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      keyframes: {
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        progress: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(300%)' } },
      },
      animation: { 'slide-in-right': 'slide-in-right .28s ease-out', 'slide-in-left': 'slide-in-left .28s ease-out', 'fade-in': 'fade-in .2s ease-out', progress: 'progress 1.2s ease-in-out infinite' },
    },
  },
  plugins: [],
} satisfies Config;
