import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6366F1',
          50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE', 300: '#A5B4FC',
          400: '#818CF8', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA',
          800: '#3730A3', 900: '#312E81', 950: '#1E1B4B',
        },
        accent: { DEFAULT: '#8B5CF6', 500: '#8B5CF6', 600: '#7C3AED' },
        ink: {
          DEFAULT: '#1E1B4B', 50: '#EEF2FF', 100: '#C7D2FE',
          500: '#1E1B4B', 700: '#1E1B4B', 900: '#0F0E2A',
        },
        navy: {
          DEFAULT: '#1E1B4B', 50: '#EEF2FF', 100: '#C7D2FE',
          500: '#1E1B4B', 700: '#0F0E2A', 900: '#070612',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      maxWidth: { pipely: '1200px', oneplace: '1200px' },
      backgroundImage: { 'pipely-gradient': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' },
    },
  },
  plugins: [],
};

export default config;
