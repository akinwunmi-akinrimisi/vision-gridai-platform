/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
        },
        accent: {
          DEFAULT: '#8B5CF6',
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
        },
        cta: {
          DEFAULT: '#F97316',
          hover: '#EA580C',
        },
        /* Near-black with blue undertone — the signature background */
        surface: {
          DEFAULT: '#F8FAFC',
          dark: '#060918',
        },
        card: {
          DEFAULT: '#FFFFFF',
          dark: '#0a0e24',
        },
        'card-hover': {
          dark: '#0f1433',
        },
        border: {
          DEFAULT: '#E2E8F0',
          dark: 'rgba(255,255,255,0.06)',
        },
        'text-muted': {
          DEFAULT: '#64748B',
          dark: '#94A3B8',
        },
        /* Semantic status */
        success: { DEFAULT: '#10B981', light: '#D1FAE5', dark: '#065F46' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7', dark: '#92400E' },
        danger: { DEFAULT: '#EF4444', light: '#FEE2E2', dark: '#991B1B' },
        info: { DEFAULT: '#06B6D4', light: '#CFFAFE', dark: '#155E75' },
      },
      fontFamily: {
        sans: ['"Fira Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        sidebar: '260px',
        'sidebar-collapsed': '72px',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        /* Glass shadows — visible depth on near-black */
        'glass': '0 0 0 1px rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        'glass-lg': '0 0 0 1px rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-hover': '0 0 0 1px rgba(255,255,255,0.10), 0 16px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10)',
        /* Colored glow halos */
        'glow-blue': '0 0 30px rgba(37,99,235,0.3), 0 0 80px rgba(37,99,235,0.1)',
        'glow-violet': '0 0 30px rgba(139,92,246,0.3), 0 0 80px rgba(139,92,246,0.1)',
        'glow-orange': '0 0 30px rgba(249,115,22,0.35), 0 0 80px rgba(249,115,22,0.1)',
        'glow-emerald': '0 0 30px rgba(16,185,129,0.3), 0 0 80px rgba(16,185,129,0.1)',
        'glow-cyan': '0 0 30px rgba(6,182,212,0.3), 0 0 80px rgba(6,182,212,0.1)',
        /* Inner light — frosted glass top edge */
        'inner-light': 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 0 0 1px rgba(255,255,255,0.04)',
        /* Elevation stack — light mode */
        'elevation-1': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'elevation-2': '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
        'elevation-3': '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.06)',
        'elevation-4': '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.08)',
        /* Dark card shadows */
        'card-dark': '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.04)',
        'card-dark-hover': '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        /* Ambient gradient mesh — subtle colored orbs on near-black */
        'gradient-mesh': 'radial-gradient(ellipse 80% 50% at 20% 40%, rgba(37,99,235,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 80% 20%, rgba(124,58,237,0.06) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 50% 90%, rgba(6,182,212,0.04) 0%, transparent 55%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'progress': 'progress 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'gradient-x': 'gradientX 3s ease infinite',
        'border-glow': 'borderGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: 0, transform: 'translateY(-8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: 0, transform: 'translateX(16px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.95)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: 0.4 },
          '50%': { opacity: 1 },
        },
        progress: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        borderGlow: {
          '0%, 100%': { opacity: 0.5 },
          '50%': { opacity: 1 },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
