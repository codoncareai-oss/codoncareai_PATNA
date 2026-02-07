/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        medical: {
          blue: '#3B82F6',
          green: '#10B981',
          red: '#EF4444',
          yellow: '#F59E0B',
        }
      }
    },
  },
  plugins: [],
}
