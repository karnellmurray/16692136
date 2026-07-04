/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold:   '#e8ff00',
        green:  '#00ff88',
        blue:   '#00aaff',
        red:    '#ff4444',
      },
      fontFamily: {
        mono:  ['IBM Plex Mono', 'monospace'],
        space: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
