import { COLORS } from './colors';

/**
 * Unified configuration for meal types
 * Includes labels, colors, icons, and chart colors
 */
export const MEAL_TYPES = {
  breakfast: {
    label: 'Breakfast',
    bgColor: COLORS.mealTypes.breakfast,
    chartColor: COLORS.chart.mealBreakfast
  },
  lunch: {
    label: 'Lunch',
    bgColor: COLORS.mealTypes.lunch,
    chartColor: COLORS.chart.mealLunch
  },
  dinner: {
    label: 'Dinner',
    bgColor: COLORS.mealTypes.dinner,
    chartColor: COLORS.chart.mealDinner
  },
  snack: {
    label: 'Snack',
    bgColor: COLORS.mealTypes.snack,
    chartColor: COLORS.chart.mealSnack
  },
  unclassified: {
    label: 'Other',
    bgColor: COLORS.mealTypes.unclassified,
    chartColor: COLORS.chart.mealUnclassified
  }
} as const;

export type MealTypeKey = keyof typeof MEAL_TYPES;

/**
 * Get meal type configuration by key
 *
 * @param type - Meal type key
 * @returns Meal type configuration object
 *
 * @example
 * ```tsx
 * const config = getMealTypeConfig('breakfast');
 * console.log(config.label); // 'Breakfast'
 * console.log(config.bgColor); // '#FFF4E6'
 * ```
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
