/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        }
      },
      animation: {
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite'
      },
      colors: {
        'game-dark': '#1a1b26',
        'game-light': '#24283b',
        'game-accent': '#7aa2f7',
      }
    },
  },
  plugins: [],
}
