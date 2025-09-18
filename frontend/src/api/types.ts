/**
 * API Types and Interfaces
 * Defines all types used across the API SDK
 */

// Base API Response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

// API Error structure
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  status?: number;
}

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

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

// Auth related types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  credential: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  created_at?: string;
  updated_at?: string;
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

// Pet related types (準備未來擴展)
export interface Pet {
  id: string;
  name: string;
  type: string;
  breed?: string;
  age?: number;
  weight?: number;
  avatar?: string;
  owner_id: string;
}

export interface PetAccess {
  pet: Pet;
  role: 'owner' | 'caregiver' | 'viewer';
  permissions: string[];
}
