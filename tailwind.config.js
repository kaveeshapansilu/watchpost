/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'rgb(var(--brand-primary) / <alpha-value>)',
          accent: 'rgb(var(--brand-accent) / <alpha-value>)',
          dark: '#0f172a',
          soft: '#ccfbf1',
          bg: '#f8fafc',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      boxShadow: { card: '0 1px 3px rgba(15,23,42,0.08), 0 4px 16px rgba(15,23,42,0.06)' },
    },
  },
  plugins: [],
};
