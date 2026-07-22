/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        gold:    '#FDC214',
        surface: '#0D0D0D',
        card:    '#111111',
        // Feed UI
        'feed-bg':  '#0a0a0a',
        'n-green':  '#00ff88',
        'n-yellow': '#e8ff00',
        'n-blue':   '#00aaff',
        'n-red':    '#ff4444',
      },
      fontFamily: {
        head:  ['Boldstrom', 'Arial', 'sans-serif'],
        body:  ['Arial', 'sans-serif'],
        mono:  ['var(--font-ibm-mono)', 'IBM Plex Mono', 'monospace'],
        space: ['var(--font-space)', 'Space Grotesk', 'sans-serif'],
      },
      keyframes: {
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulse2: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
      },
      animation: {
        ticker: 'ticker 100s linear infinite',
        pulse2: 'pulse2 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
