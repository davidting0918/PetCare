// ===== Pet Types =====

// Core Pet Interface
export interface Pet {
  id: string;
  name: string;
  pet_type: string;
  breed?: string;
  gender?: string;
  birth_date?: string;
  current_weight_kg?: number;
  target_weight_kg?: number;
  height_cm?: number;
  is_spayed?: boolean;
  microchip_id?: string;
  daily_calorie_target?: number;
  owner_id: string;
  group_id?: string | null;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  photo_url?: string;
  notes?: string;

  // Computed fields for backward compatibility
  age?: number;
  weight?: number;
  targetWeight?: number;
  photo?: string;
  dailyCalorieGoal?: number;
  ownerId?: string;
}

// Pet API Types
export interface CreatePetRequest {
  name: string;
  pet_type: string;
  breed?: string;
  gender: string;
  birth_date?: Date;
  current_weight_kg?: number;
  target_weight_kg?: number;
  height_cm?: number;
  is_spayed?: boolean;
  microchip_id?: string;
  daily_calorie_target?: number;
  notes?: string;
}

export interface PetInfo {
  id: string;
  name: string;
  pet_type: string;
  breed?: string;
  gender: string;
  current_weight_kg?: number;
  owner_id: string;
  owner_name: string;
  group_id?: string;
  group_name?: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  user_permission?: string;
}
