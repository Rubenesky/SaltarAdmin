module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#1a56db',
        accent: '#ed8936',
        success: '#16a34a',
        danger: '#dc2626',
        'light-gray': '#f3f4f6',
      },
    },
  },
  plugins: [],
}
