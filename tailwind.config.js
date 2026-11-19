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
          purple: '#a855f7',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.1)',
          medium: 'rgba(255, 255, 255, 0.15)',
          strong: 'rgba(255, 255, 255, 0.2)',
          glow: 'rgba(59, 130, 246, 0.5)',
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Oswald", "Rajdhani", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        'liquid-gradient': {
          '0%, 100%': {
            'background-position': '0% 50%',
          },
          '50%': {
            'background-position': '100% 50%',
          },
        },
      },
      animation: {
        'liquid': 'liquid-gradient 24s ease infinite',
      },
    },
  },
  plugins: [],
}
