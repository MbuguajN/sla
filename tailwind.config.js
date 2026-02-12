
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
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        "light": {
          "primary": "#D92644",
          "primary-content": "#ffffff",
          "secondary": "#000000",
          "accent": "#D92644",
          "neutral": "#000000",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#F1F5F9",
          "base-300": "#E2E8F0",
          "base-content": "#000000",
          "info": "#0EA5E9",
          "success": "#10B981",
          "warning": "#F59E0B",
          "error": "#EF4444",
        },
        "dark": {
          "primary": "#D92644",
          "primary-content": "#ffffff",
          "secondary": "#ffffff",
          "accent": "#D92644",
          "neutral": "#ffffff",
          "neutral-content": "#000000",
          "base-100": "#000000",
          "base-200": "#0A0A0A",
          "base-300": "#111111",
          "base-content": "#ffffff",
          "info": "#38BDF8",
          "success": "#34D399",
          "warning": "#FBBF24",
          "error": "#F87171",
        },
      },
    ],
  },
}
