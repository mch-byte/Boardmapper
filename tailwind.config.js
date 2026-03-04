/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        board: {
          bg: '#0a0a0f',
          surface: '#111118',
          border: '#1a1a2e',
          accent: '#06b6d4',
        },
        pin: {
          unknown: '#6b7280',
          vcc: '#ef4444',
          gnd: '#1e1e1e',
          input: '#3b82f6',
          output: '#f59e0b',
          io: '#8b5cf6',
          clock: '#06b6d4',
          data: '#10b981',
          debug: '#ec4899',
          nc: '#4b5563',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', '"SF Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
