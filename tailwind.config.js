/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Use class-based dark mode, NOT system preference
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  daisyui: {
    themes: [
      {
        light: {
          primary: '#c91f41',
          'primary-content': '#ffffff',
          secondary: '#f3f4f6',
          accent: '#c91f41',
          neutral: '#1f2937',
          'base-100': '#ffffff',
          'base-200': '#f8f9fb',
          'base-300': '#f3f4f6',
          info: '#3b82f6',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
      'dark',
    ],
  },
  plugins: [require('daisyui')],
};
