/**
 * Token Storage Implementation
 * Handles secure storage and retrieval of authentication tokens
 */

import type { TokenStorage } from './types';

export class LocalTokenStorage implements TokenStorage {
  private readonly ACCESS_TOKEN_KEY = 'petcare_access_token';
  private readonly REFRESH_TOKEN_KEY = 'petcare_refresh_token';
  private readonly USER_KEY = 'petcare_user';

  /**
   * Get access token from storage
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get access token from storage:', error);
      return null;
    }
  }

  /**
   * Set access token in storage
   */
  setToken(token: string): void {
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to set access token in storage:', error);
    }
  }

  /**
   * Remove access token from storage
   */
  removeToken(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove access token from storage:', error);
    }
  }

  /**
   * Get refresh token from storage
   */
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get refresh token from storage:', error);
      return null;
    }
  }

  /**
   * Set refresh token in storage
   */
  setRefreshToken(token: string): void {
    try {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to set refresh token in storage:', error);
    }
  }

  /**
   * Remove refresh token from storage
   */
  removeRefreshToken(): void {
    try {
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove refresh token from storage:', error);
    }
  }

  /**
   * Get stored user data
   */
  getUser(): any | null {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get user data from storage:', error);
      return null;
    }
  }

  /**
   * Set user data in storage
   */
  setUser(user: any): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to set user data in storage:', error);
    }
  }

  /**
   * Remove user data from storage
   */
  removeUser(): void {
    try {
      localStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Failed to remove user data from storage:', error);
    }
  }

  /**
   * Clear all stored authentication data
   */
  clearAll(): void {
    this.removeToken();
    this.removeRefreshToken();
    this.removeUser();
  }

  /**
   * Check if user is authenticated (has valid token)
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // In a real app, you would validate the token expiry
    // For demo purposes, we just check if token exists
    return true;
  }
}

// Export singleton instance
export const tokenStorage = new LocalTokenStorage();
