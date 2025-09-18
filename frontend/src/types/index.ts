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
  breed: string;
  age: number;
  weight: number;
  targetWeight?: number;
  photo?: string;
  dailyCalorieGoal: number;
  ownerId: string;
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
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type NavigationTab = 'dashboard' | 'meal' | 'medicine' | 'weight' | 'settings';
