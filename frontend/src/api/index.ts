/**
 * PetCare API - Unified API Client
 * Main entry point for all API operations
 *
 * Centralized API client that contains all request functions in one place
 * for easy maintenance of URLs and endpoints.
 */

// Main unified API client - THE RECOMMENDED APPROACH
export { UnifiedApiClient, createUnifiedApiClient, unifiedApiClient } from './unified-client';

// Configuration and endpoints
export { API_ENDPOINTS, API_BASE, API_CONFIG } from './endpoints';

// Storage utilities
export { LocalTokenStorage, tokenStorage } from './storage';

// Base client for advanced usage
export { BaseApiClient } from './base-client';

// Re-export types for convenience
export type {
  ApiResponse,
  ApiError,
  ApiConfig,
  // New auth types based on backend docs
  EmailLoginRequest,
  GoogleLoginRequest,
  CreateUserRequest,
  UpdateUserRequest,
  ResetPasswordRequest,
  // Response types
  LoginResponse,
  UserProfile,
  AuthUser,
  RefreshTokenRequest,
  RefreshTokenResponse,
  // Legacy types for backward compatibility
  LoginRequest,
  // Other types
  Pet,
  PetAccess,
  Food,
  Meal,
  Group,
  GroupMember,
  WeightRecord,
  WeightGoal
} from './types';

// Default export - the new unified API client
import { unifiedApiClient } from './unified-client';
import { tokenStorage } from './storage';
export default unifiedApiClient;

// Auth Service for compatibility with AuthContext
// This provides the exact methods that AuthContext expects
export const authService = {
  // Email login - matches AuthContext expectation
  loginWithEmail: async (credentials: { email: string; pwd: string }) => {
    const response = await unifiedApiClient.emailLogin(credentials);
    if (response.status === 1) {
      return {
        access_token: response.data.access_token,
        token_type: response.data.token_type,
        user: response.data.user
      };
    }
    throw new Error(response.message || 'Login failed');
  },

  // Google login - now correctly matches backend implementation
  loginWithGoogle: async (request: { token: string }) => {
    const response = await unifiedApiClient.loginWithGoogle(request);
    if (response.status === 1) {
      return {
        access_token: response.data.access_token,
        token_type: response.data.token_type,
        user: response.data.user
      };
    }
    throw new Error(response.message || 'Google login failed');
  },

  // Signup with email - creates new user account
  signupWithEmail: async (userData: { name: string; email: string; pwd: string }) => {
    // API key should be in format "key:secret" as required by backend
    const apiKey = import.meta.env.VITE_API_KEY;

    if (!apiKey) {
      throw new Error('API key not configured. Please set VITE_API_KEY in your .env file.');
    }

    // Validate API key format
    if (!apiKey.includes(':')) {
      throw new Error('Invalid API key format. Expected format: "key:secret"');
    }

    console.log('📝 Creating user account with API authentication...');
    console.log('🔐 API Key format validation: ✅');

    const response = await unifiedApiClient.createUser(userData, apiKey);
    if (response.status === 1) {
      console.log('✅ User account created successfully:', response.data);
      return {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        created: true
      };
    }
    throw new Error(response.message || 'Signup failed');
  },

  // Get stored token
  getToken: () => {
    return tokenStorage.getToken();
  },

  // Logout - local cleanup only (no backend API call)
  logout: () => {
    console.log('🚪 AuthService: Clearing local authentication data...');
    tokenStorage.clearAll(); // Clear all tokens and user data at once
    console.log('✅ AuthService: Local logout completed');
  }
};
