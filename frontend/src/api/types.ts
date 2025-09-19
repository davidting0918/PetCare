/**
 * API Types and Interfaces
 * Defines all types used across the API SDK
 * Based on backend/README.md API documentation
 */

// Base API Response structure (matches backend documentation)
export interface ApiResponse<T = any> {
  status: number;           // 1 = success, 0 = error (from backend docs)
  data: T;                  // Response data (varies by endpoint)
  message?: string;         // Human-readable message
}

// API Error structure
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  status?: number;
}

// HTTP Methods
export type HttpMethod = 'GET' | 'POST';

// Request configuration
export interface ApiRequestConfig {
  method: HttpMethod;
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  requiresAuth?: boolean;
}

// Token storage interface
export interface TokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  removeToken(): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  removeRefreshToken(): void;
}

// Auth related types (based on backend/README.md documentation)

// Email login request (backend uses 'pwd' not 'password')
export interface EmailLoginRequest {
  email: string;
  pwd: string; // Backend uses 'pwd' as documented
}

// Google Identity Services login request (JWT credential)
export interface GoogleLoginRequest {
  credential: string; // JWT credential from Google Identity Services
}

// Legacy LoginRequest (for backward compatibility)
export interface LoginRequest {
  email: string;
  password: string;
}

// AuthUser type for AuthContext compatibility
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  source?: 'email' | 'google';
}

// Login response (matches backend documentation examples)
export interface LoginResponse {
  access_token: string;
  token_type: string; // "bearer" from backend
  user: UserProfile;
  // Note: Backend docs don't show refresh_token or expires_in in examples
  refresh_token?: string;
  expires_in?: number;
}

// User profile (matches backend documentation structure)
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string; // Backend uses 'picture' not 'avatar'
  personal_group_id?: string; // From backend user creation response
  created_at?: string; // ISO 8601 format
  updated_at?: string; // ISO 8601 format
  source?: 'email' | 'google'; // Authentication source
  is_active?: boolean;
  is_verified?: boolean;
  // Legacy field for backward compatibility
  avatar?: string;
}

// User creation request
export interface CreateUserRequest {
  email: string;
  name: string;
  pwd: string; // Backend uses 'pwd'
}

// User update request
export interface UpdateUserRequest {
  name?: string;
  picture?: string;
}

// Password reset request
export interface ResetPasswordRequest {
  old_pwd: string; // Backend uses 'old_pwd'
  new_pwd: string; // Backend uses 'new_pwd'
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// API Configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
}

// Pet related types (matches backend response)
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

  // Computed fields for compatibility
  age?: number;
  weight?: number;
  avatar?: string;
  dailyCalorieGoal?: number;
  targetWeight?: number;
}

export interface PetAccess {
  petId: string;
  pet: Pet;
  role: 'Creator' | 'Member' | 'Viewer';
  groupId?: string | null;
  permissions?: string[];
}

// Meal and Food related types
export interface Food {
  id: string;
  name: string;
  brand?: string;
  category: string;
  calories_per_100g: number;
  protein_per_100g?: number;
  fat_per_100g?: number;
  carbs_per_100g?: number;
  fiber_per_100g?: number;
  image_url?: string;
  is_custom: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Meal {
  id: string;
  pet_id: string;
  food_id: string;
  food: Food;
  amount: number; // in grams
  unit: 'g' | 'kg' | 'cup' | 'piece';
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  fed_at: string; // ISO date string
  notes?: string;
  calories: number;
  fed_by: string; // user ID
  created_at?: string;
  updated_at?: string;
}

// Weight tracking types
export interface WeightRecord {
  id: string;
  pet_id: string;
  weight: number; // in kg
  date: string; // ISO date string
  notes?: string;
  body_condition_score?: number; // 1-9 scale
  recorded_by: string; // user ID
  created_at?: string;
  updated_at?: string;
}

export interface WeightGoal {
  id: string;
  pet_id: string;
  target_weight: number; // in kg
  current_weight: number; // in kg
  goal_type: 'lose' | 'gain' | 'maintain';
  target_date?: string; // ISO date string
  weekly_target?: number; // kg per week
  is_active: boolean;
  created_by: string; // user ID
  created_at?: string;
  updated_at?: string;
}

// Group and collaboration types
export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  owner_id: string;
  is_private: boolean;
  invite_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  user: UserProfile;
  role: 'owner' | 'admin' | 'member';
  permissions: string[];
  joined_at: string;
  invited_by?: string;
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  group: Group;
  inviter_id: string;
  inviter: UserProfile;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
}

// Analytics and report types
export interface NutritionSummary {
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  total_fiber: number;
  meal_count: number;
  period: string; // 'daily', 'weekly', 'monthly'
}

export interface WeightTrend {
  date: string;
  weight: number;
  trend: 'up' | 'down' | 'stable';
  change_percent: number;
}

export interface MealTrend {
  date: string;
  calories: number;
  meal_count: number;
  trend: 'up' | 'down' | 'stable';
}

// Upload and file types
export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  content_type: string;
  uploaded_at: string;
}

// System and utility types
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  database: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected';
  timestamp: string;
}

export interface SystemSettings {
  maintenance_mode: boolean;
  max_file_size: number;
  supported_image_formats: string[];
  api_version: string;
}
