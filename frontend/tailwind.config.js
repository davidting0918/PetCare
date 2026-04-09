/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Dark theme semantic groups ───────────────────────────────
        // All values reference CSS variables defined in src/styles/tokens.css.
        // The `<alpha-value>` placeholder lets Tailwind opacity modifiers
        // such as `bg-surface-1/50` resolve to `rgb(26 31 43 / 0.5)`.
        surface: {
          0: 'rgb(var(--surface-0) / <alpha-value>)',
          1: 'rgb(var(--surface-1) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          3: 'rgb(var(--surface-3) / <alpha-value>)',
        },
        border: {
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
          DEFAULT: 'rgb(var(--border-default) / <alpha-value>)',
          strong: 'rgb(var(--border-strong) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
          disabled: 'rgb(var(--text-disabled) / <alpha-value>)',
        },
        accent: {
          pink: 'rgb(var(--accent-pink) / <alpha-value>)',
          'pink-hover': 'rgb(var(--accent-pink-hover) / <alpha-value>)',
          teal: 'rgb(var(--accent-teal) / <alpha-value>)',
          'teal-hover': 'rgb(var(--accent-teal-hover) / <alpha-value>)',
          purple: 'rgb(var(--accent-purple) / <alpha-value>)',
          'purple-hover': 'rgb(var(--accent-purple-hover) / <alpha-value>)',
          blue: 'rgb(var(--accent-blue) / <alpha-value>)',
          'blue-hover': 'rgb(var(--accent-blue-hover) / <alpha-value>)',
        },
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
        'selected-pink': 'var(--shadow-selected-pink)',
        'selected-teal': 'var(--shadow-selected-teal)',
        'selected-purple': 'var(--shadow-selected-purple)',
        'selected-blue': 'var(--shadow-selected-blue)',
      },
    },
  },
  plugins: [],
}
