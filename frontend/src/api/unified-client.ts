/**
 * Unified API Client
 * Centralized API client containing ALL request functions in one place
 *
 * This design allows easy maintenance of backend URLs and endpoints:
 * - All API calls are in one file
 * - Endpoint URLs are centralized in endpoints.ts
 * - Easy to change base URL or endpoint strings
 *
 * Based on backend API documentation: backend/README.md
 */

import { BaseApiClient } from './base-client';
import { API_ENDPOINTS, API_BASE, API_CONFIG } from './endpoints';
import { LocalTokenStorage, tokenStorage } from './storage';
import type {
  ApiConfig,
  ApiResponse,
  // Auth types used in this client
  LoginResponse,
  UserProfile,
  // Pet type for future use
  Pet,
} from './types';

/**
 * Unified API Client Class
 * Contains ALL API request functions organized by feature
 * This is the SINGLE entry point for all backend communications
 */
export class UnifiedApiClient {
  private baseClient: BaseApiClient;

  constructor(config?: Partial<ApiConfig>, tokenStorageInstance: LocalTokenStorage = tokenStorage) {
    // Use centralized configuration
    const finalConfig: ApiConfig = {
      baseUrl: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT.DEFAULT,
      retryAttempts: API_CONFIG.RETRY.ATTEMPTS,
      retryDelay: API_CONFIG.RETRY.DELAY,
      enableLogging: API_CONFIG.DEBUG.ENABLE_LOGGING,
      ...config,
    };

    this.baseClient = new BaseApiClient(finalConfig, tokenStorageInstance);

    if (finalConfig.enableLogging) {
      console.log('🚀 Unified API Client initialized with config:', {
        baseUrl: finalConfig.baseUrl,
        production: API_BASE.PRODUCTION,
        development: API_BASE.DEVELOPMENT,
        current: API_BASE.CURRENT,
      });
    }
  }

  // =========================================================================
  // AUTHENTICATION API FUNCTIONS
  // Based on backend/README.md - Authentication Endpoints
  // =========================================================================

  /**
   * Email/Password Login
   * Endpoint: POST /auth/email/login
   *
   * Authenticates users with email and password credentials
   * Returns access token with user information
   */
  async emailLogin(credentials: {
    email: string;
    pwd: string; // Note: backend uses 'pwd' not 'password'
  }): Promise<ApiResponse<LoginResponse>> {
    try {
      console.log('🔐 API: Email/password login attempt...');

      const response = await this.baseClient.post<LoginResponse>(
        API_ENDPOINTS.AUTH.EMAIL_LOGIN,
        {
          email: credentials.email,
          pwd: credentials.pwd,
        },
        { requiresAuth: false }
      );

      console.log('✅ API: Email login successful');
      return response;
    } catch (error) {
      console.error('❌ API: Email login failed:', error);
      throw error;
    }
  }

  /**
   * Google Login with JWT Token (Matches Backend Implementation)
   * Endpoint: POST /auth/google/login
   *
   * Backend expects: { token: "jwt_id_token" }
   * Backend uses: id_token.verify_oauth2_token() to verify JWT tokens
   * Perfect match for Google Identity Services credentials!
   */
  async loginWithGoogle(request: { token: string }): Promise<ApiResponse<LoginResponse>> {
    try {

      const response = await this.baseClient.post<LoginResponse>(
        API_ENDPOINTS.AUTH.GOOGLE_LOGIN,
        {
          token: request.token // Backend expects { token: "jwt_token" }
        },
        { requiresAuth: false }
      );

      console.log(response);
      return response;
    } catch (error) {
      console.error('❌ API: Google JWT login failed:', error);
      throw error;
    }
  }


  /**
   * OAuth2-Compatible Access Token Generation
   * Endpoint: POST /auth/access_token
   *
   * OAuth2-compatible token endpoint using username/password format
   * Content-Type: application/x-www-form-urlencoded
   */
  async generateAccessToken(credentials: {
    username: string; // email in OAuth2 format
    password: string;
  }): Promise<ApiResponse<{ access_token: string; token_type: string; message: string }>> {
    try {
      console.log('🔐 API: OAuth2 access token generation...');

      // Create form-encoded data
      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);

      const response = await this.baseClient.request<{ access_token: string; token_type: string; message: string }>({
        method: 'POST',
        url: API_ENDPOINTS.AUTH.ACCESS_TOKEN,
        data: formData.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        requiresAuth: false,
      });

      console.log('✅ API: Access token generated successfully');
      return response;
    } catch (error) {
      console.error('❌ API: Access token generation failed:', error);
      throw error;
    }
  }

  /**
   * Logout - Local cleanup only
   * Note: Backend has no logout endpoint, so this only performs local cleanup
   *
   * Clears local tokens and session data
   */
  logout(): ApiResponse<void> {
    console.log('🚪 API: Logout (local cleanup only)...');

    // No backend API call needed - backend has no logout endpoint
    // Local cleanup is handled by the caller (AuthContext/authService)

    console.log('✅ API: Local logout completed');
    return { status: 1, data: undefined };
  }

  // =========================================================================
  // USER MANAGEMENT API FUNCTIONS
  // Based on backend/README.md - User Management Endpoints
  // =========================================================================

  /**
   * Create User Account
   * Endpoint: POST /user/create
   * Requires: X-API-Key header
   *
   * Registers new users with email validation and secure password hashing
   */
  async createUser(userData: {
    email: string;
    name: string;
    pwd: string; // backend uses 'pwd'
  }, apiKey: string): Promise<ApiResponse<UserProfile>> {
    try {
      console.log('👤 API: Creating user account...');

      const response = await this.baseClient.post<UserProfile>(
        API_ENDPOINTS.USER.CREATE,
        {
          email: userData.email,
          name: userData.name,
          pwd: userData.pwd,
        },
        {
          requiresAuth: false,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        }
      );

      console.log('✅ API: User account created successfully');
      return response;
    } catch (error) {
      console.error('❌ API: User creation failed:', error);
      throw error;
    }
  }

  /**
   * Get Current User Profile
   * Endpoint: GET /user/me
   *
   * Retrieves comprehensive profile information for authenticated user
   */
  async getCurrentUser(): Promise<ApiResponse<UserProfile>> {
    try {
      console.log('👤 API: Getting current user profile...');

      const response = await this.baseClient.get<UserProfile>(
        API_ENDPOINTS.USER.ME
      );

      console.log('✅ API: User profile retrieved successfully');
      return response;
    } catch (error) {
      console.error('❌ API: Failed to get user profile:', error);
      throw error;
    }
  }

  /**
   * Update User Information
   * Endpoint: POST /user/update
   *
   * Update user profile including name and picture
   */
  async updateUser(updates: {
    name?: string;
    picture?: string;
  }): Promise<ApiResponse<UserProfile>> {
    try {
      console.log('👤 API: Updating user profile...');

      const response = await this.baseClient.post<UserProfile>(
        API_ENDPOINTS.USER.UPDATE,
        updates
      );

      console.log('✅ API: User profile updated successfully');
      return response;
    } catch (error) {
      console.error('❌ API: User update failed:', error);
      throw error;
    }
  }

  /**
   * Reset Password
   * Endpoint: POST /user/reset_password
   *
   * Change user password with old password verification
   */
  async resetPassword(passwordData: {
    old_pwd: string;
    new_pwd: string;
  }): Promise<ApiResponse<UserProfile>> {
    try {
      console.log('🔐 API: Resetting password...');

      const response = await this.baseClient.post<UserProfile>(
        API_ENDPOINTS.USER.RESET_PASSWORD,
        {
          old_pwd: passwordData.old_pwd,
          new_pwd: passwordData.new_pwd,
        }
      );

      console.log('✅ API: Password reset successfully');
      return response;
    } catch (error) {
      console.error('❌ API: Password reset failed:', error);
      throw error;
    }
  }

  // =========================================================================
  // PET MANAGEMENT API FUNCTIONS
  // Based on backend/README.md - Pet Management Endpoints
  // (Implementation will be added in next steps)
  // =========================================================================

  /**
   * Create Pet
   * Endpoint: POST /pets/create
   * TODO: Implement based on backend documentation
   */
  async createPet(petData: {
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
    notes?: string;
  }): Promise<ApiResponse<Pet>> {
    try {
      console.log('🐾 API: Creating new pet...');
      console.log('📤 Pet data:', petData);

      const response = await this.baseClient.post<Pet>(
        API_ENDPOINTS.PETS.CREATE,
        petData
      );

      console.log('✅ API: Pet created successfully');
      console.log('📥 Backend Response:', response);
      return response;
    } catch (error) {
      console.error('❌ API: Pet creation failed:', error);
      throw error;
    }
  }

  /**
   * Get Accessible Pets
   * Endpoint: GET /pets/accessible
   * TODO: Implement based on backend documentation
   */
  async getAccessiblePets(): Promise<ApiResponse<Pet[]>> {
    return this.baseClient.get<Pet[]>(API_ENDPOINTS.PETS.ACCESSIBLE);
  }

  // =========================================================================
  // UTILITY METHODS
  // =========================================================================

  /**
   * Get current API configuration
   */
  getConfig(): ApiConfig {
    return this.baseClient.getConfig();
  }

  /**
   * Update API configuration
   * Use this to change base URL or other settings
   */
  updateConfig(updates: Partial<ApiConfig>): void {
    this.baseClient.updateConfig(updates);
  }

  /**
   * Change API base URL
   * Helper method to easily switch between environments
   */
  setBaseUrl(url: 'production' | 'development' | string): void {
    let newBaseUrl: string;

    if (url === 'production') {
      newBaseUrl = API_BASE.PRODUCTION;
    } else if (url === 'development') {
      newBaseUrl = API_BASE.DEVELOPMENT;
    } else {
      newBaseUrl = url;
    }

    this.updateConfig({ baseUrl: newBaseUrl });
    console.log(`🔧 API Base URL changed to: ${newBaseUrl}`);
  }

  /**
   * Get base client for advanced usage
   */
  getBaseClient(): BaseApiClient {
    return this.baseClient;
  }
}

/**
 * Create unified API client instance
 */
export function createUnifiedApiClient(config?: Partial<ApiConfig>): UnifiedApiClient {
  return new UnifiedApiClient(config);
}

/**
 * Default unified API client instance
 * This is the main client that should be used throughout the application
 *
 * Usage examples:
 * - unifiedApiClient.emailLogin({ email: 'user@example.com', pwd: 'password' })
 * - unifiedApiClient.getCurrentUser()
 * - unifiedApiClient.setBaseUrl('production') // Easy environment switching
 */
export const unifiedApiClient = createUnifiedApiClient();
