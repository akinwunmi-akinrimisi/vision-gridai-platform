/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#3B82F6',
        cta: '#F97316',
        surface: {
          DEFAULT: '#F8FAFC',
          dark: '#0F172A',
        },
        card: {
          DEFAULT: '#FFFFFF',
          dark: '#1E293B',
        },
        border: {
          DEFAULT: '#E2E8F0',
          dark: '#334155',
        },
        'text-muted': {
          DEFAULT: '#64748B',
          dark: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        sidebar: '260px',
        'sidebar-collapsed': '64px',
      },
    },
  },
  plugins: [],
};
