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

export interface PetInfo{
    id: string
    name: string
    pet_type: string
    breed?: string
    gender: string
    current_weight_kg?: number
    owner_id: string
    owner_name: string
    group_id?: string
    group_name?: string
    created_at: Date
    updated_at: Date
    is_active: boolean
    user_permission?: string
}
