/**
 * Unified color constants for the PetCare application
 * Use these constants instead of hardcoding color values
 */

export const COLORS = {
  // Primary brand colors
  mint: '#B8D8D8',
  orange: '#F4C2A1',
  orangeBorder: '#e8b690',

  // Semantic colors
  danger: '#EF4444',
  darkGray: '#4A5568',

  // Meal type background colors - warm peach/coral tones with varying brightness
  mealTypes: {
    breakfast: '#FFF4E6',  // Lightest - 95% brightness (soft peach)
    lunch: '#FFE0B2',      // Light - 80% brightness (light coral)
    dinner: '#FFCC80',     // Medium - 65% brightness (warm apricot)
    snack: '#FFB74D',      // Darker - 50% brightness (deep orange)
    unclassified: '#f9fafb'
  },

  // Chart and visualization colors
  chart: {
    mint: '#B8E6D3',
    gray: '#6b7280',
    border: '#e5e7eb',
    borderDark: '#d1d5db',

    // Meal type chart colors - warm color family
    mealBreakfast: '#FFE0B2',  // Light coral
    mealLunch: '#FFCC80',      // Warm apricot
    mealDinner: '#FFB74D',     // Deep orange
    mealSnack: '#FFA726',      // Vibrant orange
    mealUnclassified: '#B0BEC5'
  }
} as const;

// Type-safe color access
export type ColorKey = keyof typeof COLORS;
export type MealTypeColorKey = keyof typeof COLORS.mealTypes;
export type ChartColorKey = keyof typeof COLORS.chart;
