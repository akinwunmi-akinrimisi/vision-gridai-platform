/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0C0A1A',
        foreground: '#FAFAFA',
        card: {
          DEFAULT: '#110E2A',
          hover: '#16123A',
        },
        popover: {
          DEFAULT: '#110E2A',
          foreground: '#FAFAFA',
        },
        primary: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: 'rgba(255,255,255,0.04)',
          foreground: '#A1A1AA',
        },
        muted: {
          DEFAULT: '#1A1640',
          foreground: '#71717A',
        },
        accent: {
          DEFAULT: '#FBBF24',
          foreground: '#0C0A1A',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FAFAFA',
        },
        border: 'rgba(255,255,255,0.06)',
        'border-hover': 'rgba(255,255,255,0.12)',
        'border-accent': 'rgba(251,191,36,0.15)',
        input: 'rgba(255,255,255,0.06)',
        ring: '#F59E0B',
        success: {
          DEFAULT: '#34D399',
          bg: 'rgba(16,185,129,0.1)',
          border: 'rgba(16,185,129,0.2)',
        },
        warning: {
          DEFAULT: '#FBBF24',
          bg: 'rgba(251,191,36,0.1)',
          border: 'rgba(251,191,36,0.15)',
        },
        danger: {
          DEFAULT: '#F87171',
          bg: 'rgba(239,68,68,0.08)',
          border: 'rgba(239,68,68,0.15)',
        },
        info: {
          DEFAULT: '#A78BFA',
          bg: 'rgba(139,92,246,0.1)',
          border: 'rgba(139,92,246,0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'Cascadia Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        sidebar: '240px',
        'sidebar-collapsed': '56px',
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(245,158,11,0.2)',
        'glow-primary-lg': '0 0 30px rgba(245,158,11,0.3), 0 0 80px rgba(245,158,11,0.1)',
        'glow-success': '0 0 20px rgba(16,185,129,0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.3s ease-out forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
