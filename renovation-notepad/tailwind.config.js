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
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      fontSize: {
        'h1': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'h2': ['20px', { lineHeight: '28px', fontWeight: '700' }],
        'h3': ['18px', { lineHeight: '24px', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
}
