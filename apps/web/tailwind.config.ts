import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // Pipely brand — Indigo Premium
        brand: {
          DEFAULT: '#6366F1',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        accent: {
          DEFAULT: '#8B5CF6',
          500: '#8B5CF6',
          600: '#7C3AED',
        },
        // Navy stays for dark sections (renamed concept = "ink")
        i