import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // Klozent brand — Electric Blue
        brand: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#172554',
        },
        accent: {
          DEFAULT: '#22D3EE',
          500: '#22D3EE',
          600: '#06B6D4',
        },
        // Dark base — near-black navy ("ink")
        ink: {
          DEFAULT: '#0B1120',
          50: '#EFF3FB',
          100: '#C7D2E6',
          500: '#0B1120',
          700: '#1B2640',
          900: '#070B16',
        },
        // Backwards-compat alias for navy (used in old components)
        navy: {
          DEFAULT: '#0B1120',
          50: '#EFF3FB',
          100: '#C7D2E6',
          500: '#0B1120',
          700: '#070B16',
          900: '#04060D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        klozent: '1200px',
        pipely: '1200px', // alias
        oneplace: '1200px', // alias
      },
      backgroundImage: {
        'klozent-gradient': 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 55%, #22D3EE 100%)',
        'pipely-gradient': 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 55%, #22D3EE 100%)', // alias
      },
    },
  },
  plugins: [],
};

export default config;
