import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // Pipora brand — Ocean Pro
        brand: {
          DEFAULT: '#0EA5E9',
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
          950: '#082F49',
        },
        accent: {
          DEFAULT: '#06B6D4',
          500: '#06B6D4',
          600: '#0891B2',
        },
        // Navy stays for dark sections (renamed concept = "ink")
        ink: {
          DEFAULT: '#0C4A6E',
          50: '#F0F9FF',
          100: '#BAE6FD',
          500: '#0C4A6E',
          700: '#082F49',
          900: '#051E30',
        },
        // Backwards-compat alias for navy (used in old components)
        navy: {
          DEFAULT: '#0C4A6E',
          50: '#F0F9FF',
          100: '#BAE6FD',
          500: '#0C4A6E',
          700: '#082F49',
          900: '#051E30',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        pipora: '1200px',
        oneplace: '1200px', // alias
      },
      backgroundImage: {
        'pipora-gradient': 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
