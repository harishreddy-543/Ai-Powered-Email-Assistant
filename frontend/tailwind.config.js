/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        surface: "#0f0f12",
        surfaceLight: "#18181b",
        surfaceHover: "#1e1e23",
        primary: "#3b82f6",
        primaryDark: "#1d4ed8",
        accent: "#8b5cf6",
        accentPink: "#ec4899",
        alertRed: "#ef4444",
        alertOrange: "#f59e0b",
        alertGreen: "#22c55e",
        alertCyan: "#06b6d4",
        textMain: "#fafafa",
        textMuted: "#71717a",
        textDim: "#52525b",
        border: "rgba(255,255,255,0.06)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59,130,246,0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(59,130,246,0.3)' },
        },
      },
    },
  },
  plugins: [],
}
