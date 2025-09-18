/**
 * Authentication API Router
 * Handles all authentication-related API calls
 */

import { BaseApiClient } from './base-client';
import type {
  LoginRequest,
  GoogleLoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserProfile,
  ApiResponse
} from './types';

export class AuthAPI {
  constructor(private client: BaseApiClient) {}

  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      console.log('🔐 AuthAPI: Attempting email/password login...');

      // For demo purposes, simulate backend authentication
      // In a real app, this would make an actual API call
      const demoResponse = await this.simulateLogin(credentials);

      console.log('✅ AuthAPI: Login successful');
      return demoResponse;
    } catch (error) {
      console.error('❌ AuthAPI: Login failed:', error);
      throw error;
    }
  }

  /**
   * Login with Google OAuth credential
   */
  async loginWithGoogle(request: GoogleLoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      console.log('🔐 AuthAPI: Attempting Google OAuth login...');
      console.log('🔍 Credential preview:', request.credential.substring(0, 50) + '...');

      // For demo purposes, process the Google credential locally
      // In a real app, you would send this to your backend for verification
      const demoResponse = await this.simulateGoogleLogin(request);

      console.log('✅ AuthAPI: Google login successful');
      return demoResponse;
    } catch (error) {
      console.error('❌ AuthAPI: Google login failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<ApiResponse<RefreshTokenResponse>> {
    try {
      console.log('🔄 AuthAPI: Refreshing access token...');

      const response = await this.client.post<RefreshTokenResponse>(
        '/auth/refresh',
        request,
        { requiresAuth: false }
      );

      console.log('✅ AuthAPI: Token refreshed successfully');
      return response;
    } catch (error) {
      console.error('❌ AuthAPI: Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Logout and invalidate tokens
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      console.log('🚪 AuthAPI: Logging out...');

      // Try to call backend logout endpoint (if available)
      try {
        await this.client.post('/auth/logout', {});
      } catch (error) {
        // Ignore backend errors during logout - we'll clear local storage anyway
        console.warn('⚠️ Backend logout failed, continuing with local logout:', error);
      }

      console.log('✅ AuthAPI: Logout successful');
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      console.error('❌ AuthAPI: Logout failed:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      console.log('👤 AuthAPI: Getting user profile...');

      const response = await this.client.get<UserProfile>('/auth/profile');

      console.log('✅ AuthAPI: Profile retrieved successfully');
      return response;
    } catch (error) {
      console.error('❌ AuthAPI: Failed to get profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profile: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      console.log('👤 AuthAPI: Updating user profile...');

      const response = await this.client.put<UserProfile>('/auth/profile', profile);

      console.log('✅ AuthAPI: Profile updated successfully');
      return response;
    } catch (error) {
      console.error('❌ AuthAPI: Failed to update profile:', error);
      throw error;
    }
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<ApiResponse<{ valid: boolean; user?: UserProfile }>> {
    try {
      console.log('🔍 AuthAPI: Validating session...');

      const response = await this.client.get<{ valid: boolean; user?: UserProfile }>('/auth/validate');

      console.log('✅ AuthAPI: Session validation complete');
      return response;
    } catch (error) {
      console.error('❌ AuthAPI: Session validation failed:', error);
      throw error;
    }
  }

  // Demo implementations (remove in production)

  /**
   * Simulate email/password login for demo purposes
   */
  private async simulateLogin(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    // Import mock data
    const { mockUsers } = await import('../data/mockData');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find user in mock data
    const user = mockUsers.find(u => u.email === credentials.email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Generate demo tokens
    const accessToken = `demo_access_${Date.now()}_${user.id}`;
    const refreshToken = `demo_refresh_${Date.now()}_${user.id}`;

    const loginResponse: LoginResponse = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600, // 1 hour
      token_type: 'Bearer',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    };

    return {
      success: true,
      data: loginResponse,
      message: 'Login successful'
    };
  }

  /**
   * Simulate Google OAuth login for demo purposes
   */
  private async simulateGoogleLogin(request: GoogleLoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      // Parse Google JWT credential
      const parts = request.credential.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid Google credential format');
      }

      const payload = JSON.parse(atob(parts[1]));

      // Validate JWT
      if (payload.iss !== 'https://accounts.google.com') {
        throw new Error('Invalid JWT issuer');
      }

      if (payload.exp * 1000 < Date.now()) {
        throw new Error('JWT token has expired');
      }

      // Import mock data
      const { mockUsers } = await import('../data/mockData');

      // Find or create user
      let user = mockUsers.find(u => u.email === payload.email);

      if (!user) {
        // Create new user from Google profile
        user = {
          id: `google_${payload.sub}`,
          name: payload.name,
          email: payload.email,
          avatar: payload.picture || '/default-avatar.png'
        };
      }

      // Generate demo tokens
      const accessToken = `demo_google_access_${Date.now()}_${user.id}`;
      const refreshToken = `demo_google_refresh_${Date.now()}_${user.id}`;

      const loginResponse: LoginResponse = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar
        }
      };

      return {
        success: true,
        data: loginResponse,
        message: 'Google login successful'
      };

    } catch (error) {
      console.error('Failed to process Google credential:', error);
      throw new Error(`Google authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
