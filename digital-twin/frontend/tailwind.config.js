export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        heading: ['Rajdhani', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['DM Sans', 'sans-serif']
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(245, 168, 0, 0.12), 0 12px 48px rgba(0, 0, 0, 0.35)'
      }
    }
  },
  plugins: []
};
