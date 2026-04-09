/**
 * Color helpers for the PetCare application.
 *
 * The canonical color palette lives in CSS variables (`src/styles/tokens.css`)
 * and is exposed to Tailwind utility classes via `tailwind.config.js`. For
 * components that style themselves with `className="..."` you should reach for
 * those tokens directly (`bg-surface-1`, `text-accent-pink`, etc.) — there is
 * no longer a `COLORS` object with hex literals.
 *
 * The one exception is third-party widgets that consume colors via JavaScript
 * props rather than CSS classes. The most prominent case is `@mui/x-charts`,
 * which needs hex / rgb strings for `series` colors, axis tick labels, grid
 * stroke, and tooltip styling. To keep those widgets aligned with the design
 * tokens, use {@link getChartPalette} below — it reads the live CSS variables
 * via `getComputedStyle(document.documentElement)` and returns ready-to-use
 * `rgb(...)` strings. Re-call it inside a `useMemo` (or after a theme change)
 * if you ever introduce theme switching.
 */

const tripletVar = (name: string): string => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return '';
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return '';
  // Variables are stored as `r g b` triplets (e.g. "26 31 43"). Wrap in rgb().
  return `rgb(${raw})`;
};

/**
 * Snapshot of the design-token color palette as concrete `rgb(...)` strings.
 *
 * Use this when you need to feed colors into a third-party JS API (most often
 * `@mui/x-charts` `series` props or `slotProps`). The values are read from the
 * live CSS variables in `src/styles/tokens.css`, so changing a token in the
 * stylesheet automatically propagates here on next call.
 *
 * Returns empty strings during SSR / unit tests where `window` is undefined —
 * callers should treat that as "use chart defaults".
 */
export const getChartPalette = () => ({
  // Surfaces — chart background, tooltip background
  surface0: tripletVar('--surface-0'),
  surface1: tripletVar('--surface-1'),
  surface2: tripletVar('--surface-2'),
  surface3: tripletVar('--surface-3'),

  // Borders — grid lines, axis lines
  borderSubtle: tripletVar('--border-subtle'),
  borderDefault: tripletVar('--border-default'),
  borderStrong: tripletVar('--border-strong'),

  // Text — axis labels, tick labels
  textPrimary: tripletVar('--text-primary'),
  textSecondary: tripletVar('--text-secondary'),
  textTertiary: tripletVar('--text-tertiary'),

  // Categorical accents — meal types, weight series, etc.
  accentPink: tripletVar('--accent-pink'),
  accentTeal: tripletVar('--accent-teal'),
  accentPurple: tripletVar('--accent-purple'),
  accentBlue: tripletVar('--accent-blue'),

  // Semantic
  success: tripletVar('--success'),
  warning: tripletVar('--warning'),
  danger: tripletVar('--danger'),
  info: tripletVar('--info'),
});

export type ChartPalette = ReturnType<typeof getChartPalette>;
