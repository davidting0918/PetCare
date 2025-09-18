import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Pet, PetAccess, AppState } from '../types';
import { getUserAccessiblePets } from '../data/mockData';
import { googleAuthService } from '../services/GoogleAuthService';
import { validateGoogleConfig } from '../api/config';
import { petCareSDK, tokenStorage } from '../api';

interface AuthContextType extends AppState {
  login: (email: string, password?: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  selectPet: (pet: Pet) => void;
  getUserPets: () => PetAccess[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    user: null,
    selectedPet: null,
    isAuthenticated: false,
    isLoading: true
  });

  // Check for saved session and initialize Google OAuth on app load
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔄 AuthContext: Initializing authentication...');

      // Check for existing authentication using the new token storage
      const token = tokenStorage.getToken();
      const savedUser = tokenStorage.getUser();
      const savedPet = localStorage.getItem('petcare_selected_pet');

      if (token && savedUser) {
        console.log('🔍 AuthContext: Found existing session');
        setState(prev => ({
          ...prev,
          user: savedUser,
          isAuthenticated: true,
          selectedPet: savedPet ? JSON.parse(savedPet) : null,
          isLoading: false
        }));
      } else {
        console.log('ℹ️ AuthContext: No existing session found');
        setState(prev => ({
          ...prev,
          isLoading: false
        }));
      }

      // Initialize Google OAuth Service
      if (validateGoogleConfig()) {
        try {
          await googleAuthService.initializeGoogle();
          console.log('🔐 AuthContext: Google Auth Service initialized successfully');
        } catch (error) {
          console.error('❌ AuthContext: Failed to initialize Google Auth Service:', error);
        }
      } else {
        console.warn('⚠️ AuthContext: Google OAuth not configured properly. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
      }

      console.log('✅ AuthContext: Authentication initialization complete');
    };

    initializeAuth();
  }, []);

  const handleGoogleSuccess = async (credential: string): Promise<boolean> => {
    try {
      console.log('🎉 AuthContext: Google authentication successful, processing with SDK...');

      // Use the new API SDK for Google authentication
      const response = await petCareSDK.auth.loginWithGoogle({ credential });

      if (response.success && response.data) {
        console.log('✅ AuthContext: SDK authentication successful');

        // Store tokens using the new token storage
        tokenStorage.setToken(response.data.access_token);
        if (response.data.refresh_token) {
          tokenStorage.setRefreshToken(response.data.refresh_token);
        }
        tokenStorage.setUser(response.data.user);

        // Update context state
        setState(prev => ({
          ...prev,
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false
        }));

        console.log('🎯 AuthContext: Google authentication completed successfully');
        return true;
      } else {
        console.error('❌ AuthContext: SDK authentication failed:', response.message);
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error) {
      console.error('❌ AuthContext: Google authentication error:', error);

      if (error && typeof error === 'object' && 'message' in error) {
        console.error('📋 AuthContext: Error details:', error);
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const handleGoogleError = (error: string) => {
    console.error('❌ Google authentication failed:', error);
    setState(prev => ({ ...prev, isLoading: false }));
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    console.log('🔐 AuthContext: Starting email/password login...');
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Use the new API SDK for email/password authentication
      const response = await petCareSDK.auth.login({
        email,
        password: password || 'demo123' // Default password for demo
      });

      if (response.success && response.data) {
        console.log('✅ AuthContext: SDK login successful');

        // Store tokens using the new token storage
        tokenStorage.setToken(response.data.access_token);
        if (response.data.refresh_token) {
          tokenStorage.setRefreshToken(response.data.refresh_token);
        }
        tokenStorage.setUser(response.data.user);

        // Update context state
        setState(prev => ({
          ...prev,
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false
        }));

        console.log('🎯 AuthContext: Email login completed successfully');
        return true;
      } else {
        console.error('❌ AuthContext: SDK login failed:', response.message);
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    console.log('🚀 [REBUILT] Starting Google authentication...')

    if (!googleAuthService.isLoaded()) {
      console.error('❌ Google Auth Service not loaded');
      return false;
    }

    if (!validateGoogleConfig()) {
      console.error('❌ Google OAuth not configured properly');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      return new Promise((resolve) => {
        googleAuthService.authenticateWithButton({
          onSuccess: async (credential: string) => {
            console.log('🎉 Google authentication success, processing credential...')
            const success = await handleGoogleSuccess(credential);
            resolve(success);
          },
          onError: (error: string) => {
            console.error('❌ Google authentication failed:', error);
            handleGoogleError(error);
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error('❌ Critical error in loginWithGoogle:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const logout = async () => {
    console.log('🚪 AuthContext: Starting logout...');
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Call SDK logout (this will attempt to invalidate tokens on backend)
      await petCareSDK.auth.logout();
      console.log('✅ AuthContext: SDK logout successful');
    } catch (error) {
      // Even if SDK logout fails, we should still clear local data
      console.warn('⚠️ AuthContext: SDK logout failed, continuing with local cleanup:', error);
    }

    // Clear all authentication data using token storage
    tokenStorage.clearAll();
    localStorage.removeItem('petcare_selected_pet');

    // Update context state
    setState({
      user: null,
      selectedPet: null,
      isAuthenticated: false,
      isLoading: false
    });

    console.log('🎯 AuthContext: Logout completed successfully');
  };

  const selectPet = (pet: Pet) => {
    setState(prev => ({
      ...prev,
      selectedPet: pet
    }));

    // Save to localStorage
    localStorage.setItem('petcare_selected_pet', JSON.stringify(pet));
  };

  const getUserPets = (): PetAccess[] => {
    if (!state.user) return [];
    return getUserAccessiblePets(state.user.id);
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    loginWithGoogle,
    logout,
    selectPet,
    getUserPets
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
