/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        cyber: {
          bg:       '#050816',
          surface:  '#0d1117',
          card:     '#111827',
          border:   '#1f2937',
          neon:     '#00f5ff',
          pink:     '#ff2d78',
          purple:   '#a855f7',
          gold:     '#fbbf24',
          green:    '#10b981',
          red:      '#ef4444',
        },
      },
      backgroundImage: {
        'cyber-grid': `
          linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)
        `,
        'neon-glow': 'radial-gradient(ellipse at center, rgba(0,245,255,0.15) 0%, transparent 70%)',
        'card-glass': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'neon':       '0 0 20px rgba(0,245,255,0.4), 0 0 60px rgba(0,245,255,0.1)',
        'neon-sm':    '0 0 10px rgba(0,245,255,0.3)',
        'pink-glow':  '0 0 20px rgba(255,45,120,0.4), 0 0 60px rgba(255,45,120,0.1)',
        'purple-glow':'0 0 20px rgba(168,85,247,0.4)',
        'card':       '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card-hover': '0 16px 48px rgba(0,0,0,0.7), 0 0 30px rgba(0,245,255,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      animation: {
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'float':      'float 6s ease-in-out infinite',
        'spin-slow':  'spin 8s linear infinite',
        'grid-flow':  'gridFlow 20s linear infinite',
        'shimmer':    'shimmer 2s linear infinite',
        'glow-ring':  'glowRing 3s ease-in-out infinite',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 20px rgba(0,245,255,0.6), 0 0 40px rgba(0,245,255,0.3)' },
          '50%':      { opacity: 0.7, boxShadow: '0 0 10px rgba(0,245,255,0.3), 0 0 20px rgba(0,245,255,0.1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        gridFlow: {
          '0%':   { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 40px' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowRing: {
          '0%, 100%': { boxShadow: '0 0 0 2px rgba(0,245,255,0.3), 0 0 20px rgba(0,245,255,0.2)' },
          '50%':      { boxShadow: '0 0 0 4px rgba(0,245,255,0.6), 0 0 40px rgba(0,245,255,0.4)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
