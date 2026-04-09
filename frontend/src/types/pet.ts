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
  group_name?: string | null;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  photo_url?: string;
  notes?: string;

  age?: number;
  weight?: number;
  targetWeight?: number;
  photo?: string;
  dailyCalorieGoal?: number;
  ownerId?: string;
}

export type PetType = 'dog' | 'cat' | 'bird' | 'fish' | 'rabbit' | 'other';
export type PetGender = 'male' | 'female' | 'unknown';

// Pet API Types
export interface CreatePetRequest {
  name: string;
  pet_type: PetType;
  breed?: string;
  gender: PetGender;
  birth_date?: string;
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
  target_weight_kg?: number;
  daily_calorie_target: number;
  owner_id: string;
  owner_name: string;
  group_id?: string | null;
  group_name?: string | null;
  created_at: string;
  updated_at: string;
  photo_url?: string;
  is_active: boolean;
  user_permission?: string;
}

export interface PetDetails {
  id: string;
  name: string;
  pet_type: string;
  breed?: string;
  gender: string;
  birth_date?: string;
  age?: number;
  current_weight_kg?: number;
  target_weight_kg?: number;
  height_cm?: number;
  is_spayed?: boolean;
  microchip_id?: string;
  daily_calorie_target?: number;
  owner_id: string;
  owner_name: string;
  group_id?: string | null;
  group_name?: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  notes?: string;
}

export interface UpdatePetRequest {
  name?: string;
  breed?: string;
  gender?: PetGender;
  birth_date?: number;
  current_weight_kg?: number;
  target_weight_kg?: number;
  height_cm?: number;
  is_spayed?: boolean;
  microchip_id?: string;
  daily_calorie_target?: number;
  notes?: string;
}
