import type { ChartPalette } from './colors';

/**
 * Categorical accent assignment for meal types.
 *
 * Each meal type maps to one of the four design-token accents:
 *   breakfast → pink   (primary, start of day)
 *   lunch     → teal   (success, midday)
 *   dinner    → purple (history, evening)
 *   snack     → blue   (info, light)
 *
 * `bgClass` / `textClass` / `borderClass` are Tailwind utility strings ready
 * to drop into a `className`. `chartColorKey` is the matching field name in
 * the chart palette (see `getChartPalette` in `./colors`) so chart series
 * props stay aligned with the same token assignment.
 */
export const MEAL_TYPES = {
  breakfast: {
    label: 'Breakfast',
    bgClass: 'bg-accent-pink/15',
    textClass: 'text-accent-pink',
    borderClass: 'border-accent-pink/30',
    chartColorKey: 'accentPink' as const,
  },
  lunch: {
    label: 'Lunch',
    bgClass: 'bg-accent-teal/15',
    textClass: 'text-accent-teal',
    borderClass: 'border-accent-teal/30',
    chartColorKey: 'accentTeal' as const,
  },
  dinner: {
    label: 'Dinner',
    bgClass: 'bg-accent-purple/15',
    textClass: 'text-accent-purple',
    borderClass: 'border-accent-purple/30',
    chartColorKey: 'accentPurple' as const,
  },
  snack: {
    label: 'Snack',
    bgClass: 'bg-accent-blue/15',
    textClass: 'text-accent-blue',
    borderClass: 'border-accent-blue/30',
    chartColorKey: 'accentBlue' as const,
  },
  unclassified: {
    label: 'Other',
    bgClass: 'bg-surface-2',
    textClass: 'text-text-tertiary',
    borderClass: 'border-border-subtle',
    chartColorKey: 'textTertiary' as const,
  },
} as const;

export type MealTypeKey = keyof typeof MEAL_TYPES;

/**
 * Get meal type configuration by key
 */
export const getMealTypeConfig = (type: MealTypeKey) => MEAL_TYPES[type];

/**
 * Get all meal type keys
 */
export const getMealTypeKeys = (): MealTypeKey[] => {
  return Object.keys(MEAL_TYPES) as MealTypeKey[];
};

/**
 * Check if a string is a valid meal type key
 */
export const isValidMealType = (type: string): type is MealTypeKey => {
  return type in MEAL_TYPES;
};

/**
 * Resolve a meal type's chart series color from a live chart palette snapshot.
 *
 * Returns an empty string when the palette wasn't ready (SSR / before mount),
 * which MUI x-charts treats as "use the default series color" — safe fallback.
 */
export const getMealTypeChartColor = (
  type: MealTypeKey,
  palette: ChartPalette
): string => {
  const key = MEAL_TYPES[type].chartColorKey;
  return palette[key] ?? '';
};
