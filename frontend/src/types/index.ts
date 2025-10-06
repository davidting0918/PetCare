// ===== Main Types Export =====

export * from './auth';
export * from './user';
export * from './pet';

// Common API Types
export interface ApiResponse<T> {
  status: number;
  data: T;
  message: string;
}

// App Navigation Types
export type NavigationTab = 'dashboard' | 'meal' | 'medicine' | 'weight' | 'settings';

// App State Types
import type { User } from './user';
import type { Pet } from './pet';
export interface AppState {
  user: User | null;
  currentPet: Pet | null;
  userPets: Pet[] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
