/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9f4',
          100: '#dbf1e5',
          200: '#bce2cc',
          300: '#8eccab',
          400: '#5cb184',
          500: '#218c53',
          600: '#1c7444',
          700: '#175e38',
          800: '#134e30',
          900: '#11432a',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
