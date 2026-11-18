/** @type {import('tailwindcss').Config} */
export default {
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: '380px',
      },
      colors: {
        background: {
          main: '#080a0f',
          surface: '#111827',
          panel: '#1f2937',
          card: '#12161f',
          tv: '#08090e',
        },
        accent: {
          primary: '#3b82f6',
          secondary: '#6366f1',
          success: '#10b981',
          danger: '#f43f5e',
          warning: '#f59e0b',
          neon: '#06b6d4',
          purple: '#a855f7',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.1)',
          medium: 'rgba(255, 255, 255, 0.15)',
          strong: 'rgba(255, 255, 255, 0.2)',
          glow: 'rgba(59, 130, 246, 0.5)',
        },
      },
      boxShadow: {
        'neon-blue': '0 0 25px rgba(59, 130, 246, 0.4)',
        'neon-cyan': '0 0 25px rgba(6, 182, 212, 0.4)',
        'neon-emerald': '0 0 25px rgba(16, 185, 129, 0.4)',
        'neon-rose': '0 0 25px rgba(244, 63, 94, 0.4)',
        'neon-amber': '0 0 25px rgba(245, 158, 11, 0.4)',
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Oswald", "Rajdhani", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
}
