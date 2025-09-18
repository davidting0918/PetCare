/**
 * PetCare API SDK
 * Main entry point for all API operations
 */

import { BaseApiClient } from './base-client';
import { AuthAPI } from './auth-api';
import { LocalTokenStorage, tokenStorage } from './storage';
import type { ApiConfig } from './types';

// Default API configuration
const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  enableLogging: import.meta.env.DEV || false // Enable in development
};

/**
 * PetCare API SDK Class
 * Provides access to all API endpoints through organized routers
 */
export class PetCareSDK {
  private baseClient: BaseApiClient;
  private _auth: AuthAPI;

  // API Routers
  public readonly auth: AuthAPI;

  constructor(config: Partial<ApiConfig> = {}, tokenStorageInstance: LocalTokenStorage = tokenStorage) {
    // Merge configuration
    const finalConfig: ApiConfig = { ...DEFAULT_CONFIG, ...config };

    // Initialize base client
    this.baseClient = new BaseApiClient(finalConfig, tokenStorageInstance);

    // Initialize API routers
    this._auth = new AuthAPI(this.baseClient);

    // Expose routers
    this.auth = this._auth;

    if (finalConfig.enableLogging) {
      console.log('🚀 PetCare SDK initialized:', {
        baseUrl: finalConfig.baseUrl,
        timeout: finalConfig.timeout,
        retryAttempts: finalConfig.retryAttempts,
        enableLogging: finalConfig.enableLogging
      });
    }
  }

  /**
   * Get the base client instance (for advanced usage)
   */
  public getBaseClient(): BaseApiClient {
    return this.baseClient;
  }

  /**
   * Update SDK configuration
   */
  public updateConfig(updates: Partial<ApiConfig>): void {
    this.baseClient.updateConfig(updates);

    if (this.baseClient.getConfig().enableLogging) {
      console.log('🔧 PetCare SDK configuration updated:', updates);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): ApiConfig {
    return this.baseClient.getConfig();
  }

  // Placeholder for future API routers
  // TODO: Add more routers as needed
  // public readonly pet: PetAPI;
  // public readonly meal: MealAPI;
  // public readonly weight: WeightAPI;
  // public readonly group: GroupAPI;
}

/**
 * Create SDK instance with default configuration
 */
export function createPetCareSDK(config?: Partial<ApiConfig>): PetCareSDK {
  return new PetCareSDK(config);
}

/**
 * Default SDK instance
 * Use this for most applications unless you need custom configuration
 */
export const petCareSDK = createPetCareSDK();

// Re-export types for convenience
export type {
  ApiResponse,
  ApiError,
  ApiConfig,
  LoginRequest,
  GoogleLoginRequest,
  LoginResponse,
  UserProfile,
  RefreshTokenRequest,
  RefreshTokenResponse,
  Pet,
  PetAccess
} from './types';

// Re-export classes for advanced usage
export { BaseApiClient } from './base-client';
export { AuthAPI } from './auth-api';
export { LocalTokenStorage, tokenStorage } from './storage';

export default petCareSDK;
