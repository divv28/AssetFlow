/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7B5C73',
          hover: '#6A4D63',
          light: '#F5F2F7',
        },
        odoo: {
          bg: '#FAFAFA',
          card: '#FFFFFF',
          border: '#D9CFE0',
          infoBg: '#E3F2F3',
          infoText: '#0E4F52', // Dark teal text
          textPrimary: '#2E2E2E',
          textSecondary: '#6B6B6B',
        }
      },
      borderRadius: {
        'card': '16px',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
