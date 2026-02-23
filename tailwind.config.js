
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.05)',
        'glow': '0 0 20px rgba(190, 30, 61, 0.3)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'pulse-slow': 'pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        "light": {
          "primary": "#BE1E3D", // Softer Ruby
          "primary-content": "#ffffff",
          "secondary": "#1E293B", // Slate
          "accent": "#BE1E3D",
          "neutral": "#334155",
          "neutral-content": "#ffffff",
          "base-100": "#F8FAFC", // Soft white
          "base-200": "#F1F5F9",
          "base-300": "#E2E8F0",
          "base-content": "#0F172A", // Deep Slate text
          "info": "#0EA5E9",
          "success": "#10B981",
          "warning": "#F59E0B",
          "error": "#EF4444",
        },
        "dark": {
          "primary": "#BE1E3D",
          "primary-content": "#ffffff",
          "secondary": "#F8FAFC",
          "accent": "#BE1E3D",
          "neutral": "#1E293B",
          "neutral-content": "#ffffff",
          "base-100": "#0F172A", // Deep Slate background
          "base-200": "#1E293B",
          "base-300": "#334155",
          "base-content": "#F8FAFC",
          "info": "#38BDF8",
          "success": "#34D399",
          "warning": "#FBBF24",
          "error": "#F87171",
        },
      },
    ],
  },
}
