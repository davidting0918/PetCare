/**
 * Temporary placeholder data and functions
 * TODO: Replace all of these with real API calls
 */

// Temporary empty arrays and placeholder functions
export const mockFamilyMembers: any[] = [];
export const mockFoods: any[] = [];
export const mockPets: any[] = [];
export const mockMealEntries: any[] = [];
export const mockWeightEntries: any[] = [];
export const mockActivities: any[] = [];
export const mockDailySummary = {
  date: new Date(),
  petId: '',
  caloriesConsumed: 0,
  caloriesGoal: 0,
  mealsLogged: 0,
  weight: 0,
  medicinesGiven: 0,
  medicinesScheduled: 0
};

// Placeholder functions that return empty data
export const getTodayMeals = (_petId: string): any[] => [];
export const getTodayMedicineLogs = (_petId: string): any[] => [];
export const getPetWeightEntries = (_petId: string): any[] => [];
export const getLatestWeightEntry = (_petId: string): any => null;
export const calculateWeightProgress = (_petId: string): number => 0;
export const getWeeklyWeightAverage = (_petId: string, _weeksAgo: number = 0): number => 0;
export const getWeightTrend = (_petId: string): 'up' | 'down' | 'stable' => 'stable';

// Settings page functions
export const mockUsers: any[] = [];
export const getUserGroupMemberships = (_userId: string): any[] => [];
export const getGroupMembers = (_groupId: string): any[] => [];
export const generateInviteCode = (): string => Math.random().toString(36).substring(2, 10).toUpperCase();
export const validateInviteCode = (_code: string): any => null;
