// Food Types

export type FoodType = 'wet_food' | 'dry_food';
export type TargetPet = 'dog' | 'cat' | 'bird' | 'fish' | 'rabbit' | 'other';

export interface Food {
  id: string;
  creator_id: string;
  group_id: string;
  brand: string;
  product_name: string;
  food_type: FoodType;
  target_pet: TargetPet;
  unit_weight: number; // in grams
  calories: number; // per 100g
  protein: number; // percentage
  fat: number; // percentage
  moisture: number; // percentage
  carbohydrate: number; // percentage
  created_at: string;
  updated_at: string;
  is_active: boolean;
  photo_url?: string;
}

export interface FoodInfo {
  id: string;
  brand: string;
  product_name: string;
  food_type: FoodType;
  target_pet: TargetPet;
  unit_weight: number;
  calories: number;
  protein: number;
  fat: number;
  moisture: number;
  carbohydrate: number;
  photo_url?: string;
  created_at: string;
  updated_at: string;
  group_id: string;
  creator_id: string;
}

export interface FoodDetails {
  id: string;
  brand: string;
  product_name: string;
  food_type: FoodType;
  target_pet: TargetPet;
  unit_weight: number;
  calories: number;
  protein: number;
  fat: number;
  moisture: number;
  carbohydrate: number;
  created_at: string;
  updated_at: string;
  group_id: string;
  group_name: string;
  photo_url?: string;
  creator_id: string;
  creator_name: string;
  calories_per_unit: number;
}

export interface FoodSearchResult {
  id: string;
  brand: string;
  product_name: string;
  food_type: FoodType;
  target_pet: TargetPet;
  unit_weight: number;
  calories: number;
  photo_url?: string;
  group_id: string;
  group_name: string;
}

export interface CreateFoodRequest {
  brand: string;
  product_name: string;
  food_type: FoodType;
  target_pet: TargetPet;
  unit_weight: number;
  calories: number;
  protein: number;
  fat: number;
  moisture: number;
  carbohydrate: number;
}

export interface UpdateFoodRequest {
  brand?: string;
  product_name?: string;
  food_type?: FoodType;
  target_pet?: TargetPet;
  unit_weight?: number;
  calories?: number;
  protein?: number;
  fat?: number;
  moisture?: number;
  carbohydrate?: number;
}
