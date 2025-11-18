// Meal Types

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ServingType = 'units' | 'grams';

export interface MealRecord {
  id: string;
  pet_id: string;
  food_id: string;
  user_id: string;
  group_id: string;
  timestamp: string; // ISO date string
  meal_type: MealType | null;
  serving_type: ServingType;
  serving_amount: number;
  actual_weight_g: number;
  calories: number;
  protein_g: number;
  fat_g: number;
  moisture_g: number;
  carbohydrate_g: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface MealInfo {
  id: string;
  pet_id: string;
  pet_name: string;
  food_id: string;
  food_name: string;
  user_id: string;
  fed_by_name: string;
  timestamp: string;
  meal_type: MealType | null;
  serving_type: ServingType;
  serving_amount: number;
  actual_weight_g: number;
  calories: number;
  created_at: string;
  updated_at: string;
  group_id: string;
}

export interface MealDetails {
  id: string;
  pet_id: string;
  pet_name: string;
  food_id: string;
  food_name: string;
  food_brand: string;
  food_product_name: string;
  user_id: string;
  fed_by_name: string;
  group_id: string;
  group_name: string;
  timestamp: string;
  meal_type: MealType | null;
  serving_type: ServingType;
  serving_amount: number;
  actual_weight_g: number;
  calories: number;
  protein_g: number;
  fat_g: number;
  moisture_g: number;
  carbohydrate_g: number;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface CreateMealRequest {
  pet_id: string;
  food_id: string;
  fed_at?: string; // ISO date string, defaults to now
  meal_type?: MealType;
  serving_type: ServingType;
  serving_amount: number;
  notes?: string;
}

export interface UpdateMealRequest {
  food_id?: string;
  fed_at?: string;
  meal_type?: MealType;
  serving_type?: ServingType;
  serving_amount?: number;
  notes?: string;
}

export interface TodayMealSummary {
  date: string; // YYYY-MM-DD format
  total_meals: number;
  total_calories: number;
  total_weight_g: number;
  breakfast_count: number;
  lunch_count: number;
  dinner_count: number;
  snack_count: number;
  pet_id?: string;
  pet_name?: string;
  daily_calorie_target?: number;
  calorie_target_percentage?: number;
  group_id?: string;
  pets_fed_count?: number;
}

export interface MealStatistics {
  date_from: string;
  date_to: string;
  total_days: number;
  total_meals: number;
  total_calories: number;
  total_weight_g: number;
  average_meals_per_day: number;
  average_calories_per_day: number;
  average_protein_g_per_day: number;
  average_fat_g_per_day: number;
  average_moisture_g_per_day: number;
  average_carbohydrate_g_per_day: number;
  meal_type_distribution: Record<string, number>;
  most_active_feeders: Array<{ user_name: string; meal_count: number }>;
  most_used_foods: Array<{ food_name: string; usage_count: number }>;
  target_achievement?: {
    days_on_target: number;
    average_target_percentage: number;
  };
}

export interface MealQueryFilters {
  pet_id?: string;
  group_id?: string;
  user_id?: string;
  date_from?: string; // YYYY-MM-DD format
  date_to?: string; // YYYY-MM-DD format
  meal_type?: MealType;
  limit?: number;
  offset?: number;
}
