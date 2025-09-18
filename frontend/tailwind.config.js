/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#F2EAD3',     // 米色主色
        mint: '#B8E6D3',        // 薄荷綠
        orange: '#F4C2A1',      // 淺橘色
        earth: '#8D7053',       // 大地棕
      },
      boxShadow: {
        '3d': '0 4px 8px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
        '3d-hover': '0 6px 12px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15)',
        '3d-pressed': 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
}
