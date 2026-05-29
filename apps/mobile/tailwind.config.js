/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.tsx",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        neutral: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#6c757d',
          700: '#495057',
          800: '#1e1e1e',
          900: '#121212',
        },
        brand: {
          social: '#e1306c',
          academic: '#7289da',
          career: '#0077b5',
          premium: '#ffb703',
        },
        content: {
          primary: '#111111',
          secondary: '#555555',
          darkPrimary: '#ffffff',
          darkSecondary: '#aaaaaa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
        'input': '12px',
      },
    },
  },
  plugins: [],
};
