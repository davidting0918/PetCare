// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
}

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

export type UserRole = 'Creator' | 'Member' | 'Viewer';

export interface PetAccess {
  petId: string;
  userId: string;
  role: UserRole;
  pet: Pet;
}

export interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
  role: 'Adult' | 'Child';
}

// Group Management Types
export interface Group {
  id: string;
  name: string;
  icon?: string;
  createdBy: string;
  createdAt: Date;
  memberCount: number;
}

export interface GroupMembership {
  groupId: string;
  userId: string;
  role: 'Creator' | 'Member' | 'Viewer';
  joinedAt: Date;
  group: Group;
}

export interface InviteCode {
  id: string;
  code: string;
  groupId: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: Date;
}

// Food and Meal Types
export interface Food {
  id: string;
  name: string;
  caloriesPerUnit: number;
  unit: string; // 'cup', 'gram', 'piece', etc.
  photo?: string;
  category: 'dry-food' | 'wet-food' | 'treat' | 'supplement';
  isFavorite: boolean;
}

export interface MealEntry {
  id: string;
  petId: string;
  foodId: string;
  amount: number;
  calories: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  timestamp: Date;
  loggedBy: string; // User ID or Family Member ID
  food: Food;
}

// Weight Tracking Types
export interface WeightEntry {
  id: string;
  petId: string;
  weight: number;
  date: Date;
  notes?: string;
  photo?: string;
  loggedBy: string;
}

// Medicine Management Types
export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: 'daily' | 'twice-daily' | 'weekly' | 'as-needed';
  timeOfDay: string[];
  startDate: Date;
  endDate?: Date;
  instructions?: string;
}

export interface MedicineSchedule {
  id: string;
  petId: string;
  medicineId: string;
  medicine: Medicine;
  isActive: boolean;
}

export interface MedicineLog {
  id: string;
  petId: string;
  medicineId: string;
  scheduledTime: Date;
  actualTime?: Date;
  isGiven: boolean;
  givenBy?: string;
  notes?: string;
  medicine: Medicine;
}

// Activity and Dashboard Types
export interface Activity {
  id: string;
  petId: string;
  type: 'meal' | 'weight' | 'medicine' | 'note';
  description: string;
  timestamp: Date;
  performedBy: string;
  data?: any; // Additional data specific to activity type
}

export interface DailySummary {
  date: Date;
  petId: string;
  caloriesConsumed: number;
  caloriesGoal: number;
  mealsLogged: number;
  weight?: number;
  medicinesGiven: number;
  medicinesScheduled: number;
}

// App State Types
export interface AppState {
  user: User | null;
  selectedPet: Pet | null;
  userPets: PetAccess[] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type NavigationTab = 'dashboard' | 'meal' | 'medicine' | 'weight' | 'settings';
