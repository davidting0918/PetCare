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

        // ─── Legacy compatibility aliases ─────────────────────────────
        // These keep the existing 29 .tsx files (`bg-orange`, `text-earth`,
        // `bg-mint`, `bg-primary`, etc.) rendering identically to master.
        // Values now flow through legacy CSS variables in tokens.css instead
        // of hex literals. To be removed once issues #54-#57 finish sweeping
        // all consumer files; the new code in #53 onward should never use
        // these names.
        primary: 'rgb(var(--legacy-primary) / <alpha-value>)',
        mint: 'rgb(var(--legacy-mint) / <alpha-value>)',
        orange: 'rgb(var(--legacy-orange) / <alpha-value>)',
        earth: 'rgb(var(--legacy-earth) / <alpha-value>)',
      },
      boxShadow: {
        // New token-driven shadows (#53 onward).
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
        'selected-pink': 'var(--shadow-selected-pink)',
        'selected-teal': 'var(--shadow-selected-teal)',
        'selected-purple': 'var(--shadow-selected-purple)',
        'selected-blue': 'var(--shadow-selected-blue)',

        // Legacy 3D shadows — kept until card-3d / btn-3d* are swept out.
        '3d': 'var(--legacy-shadow-3d)',
        '3d-hover': 'var(--legacy-shadow-3d-hover)',
        '3d-pressed': 'var(--legacy-shadow-3d-pressed)',
      },
    },
  },
  plugins: [],
}
