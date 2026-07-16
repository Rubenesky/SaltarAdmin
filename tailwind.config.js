module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Source Sans 3', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Lexend', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#0F766E',
        accent: '#0369A1',
        success: '#16a34a',
        danger: '#dc2626',
        warning: '#d97706',
        'light-gray': '#f3f4f6',
      },
    },
  },
  plugins: [],
}
