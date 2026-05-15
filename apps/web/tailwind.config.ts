import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#DB0000',
          50: '#FFE5E5',
          100: '#FFB8B8',
          500: '#DB0000',
          600: '#B80000',
          700: '#8F0000',
        },
        navy: {
          DEFAULT: '#13273B',
          50: '#E6EAEF',
          100: '#B8C2CC',
          500: '#13273B',
          700: '#0B1825',
          900: '#040A11',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        oneplace: '1200px',
      },
    },
  },
  plugins: [],
};

export default config;
