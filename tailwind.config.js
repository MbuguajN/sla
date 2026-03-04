
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 10px 30px -5px rgba(0, 0, 0, 0.04), 0 4px 12px -5px rgba(0, 0, 0, 0.03)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.06)',
        'glass-ruby': '0 8px 32px 0 rgba(190, 30, 61, 0.15)',
        'glow': '0 0 25px rgba(190, 30, 61, 0.25)',
        'ruby-soft': '0 4px 14px 0 rgba(190, 30, 61, 0.39)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'subtle-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'subtle-float': 'subtle-float 4s ease-in-out infinite',
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
          "secondary": "#E5E5E5",
          "accent": "#BE1E3D",
          "neutral": "#1A1A1A",
          "neutral-content": "#ffffff",
          "base-100": "#000000",
          "base-200": "#111111",
          "base-300": "#1A1A1A",
          "base-content": "#E5E5E5",
          "info": "#38BDF8",
          "success": "#34D399",
          "warning": "#FBBF24",
          "error": "#F87171",
        },
      },
    ],
  },
}
