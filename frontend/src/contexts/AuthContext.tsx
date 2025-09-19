import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Pet, PetAccess, AppState } from '../types';
// import { getUserAccessiblePets } from '../data/mockData'; // Using real API now
import { googleAuthService } from '../services/GoogleAuthService';
import { validateGoogleConfig } from '../api/config';
import { unifiedApiClient, tokenStorage, authService } from '../api';

interface AuthContextType extends AppState {
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  selectPet: (pet: Pet) => void;
  getUserPets: () => PetAccess[];
  createPet: (petData: any) => Promise<Pet>;
  refreshUserPets: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    user: null,
    selectedPet: null,
    userPets: null,
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
        console.log('🔍 Checking Google configuration...');
        console.log('📋 Google Config:', {
          hasClientId: !!import.meta.env.VITE_GOOGLE_CLIENT_ID,
          clientIdPreview: import.meta.env.VITE_GOOGLE_CLIENT_ID ?
            import.meta.env.VITE_GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'Not set',
          isValid: validateGoogleConfig()
        });

        if (validateGoogleConfig()) {
          try {
            console.log('🔧 Initializing Google Auth Service...');
            await googleAuthService.initializeGoogle();
            console.log('✅ Google Auth Service initialized successfully');
          } catch (error) {
            console.error('❌ Failed to initialize Google Auth Service:', error);
            console.error('💡 Possible causes:');
            console.error('   1. Google APIs not loading correctly');
            console.error('   2. Network connectivity issues');
            console.error('   3. CORS or domain restrictions');
          }
        } else {
          console.error('❌ Google OAuth configuration invalid!');
          console.error('📝 To fix this:');
          console.error('   1. Create a .env file in your frontend folder');
          console.error('   2. Add: VITE_GOOGLE_CLIENT_ID=your_actual_client_id');
          console.error('   3. Get your Client ID from: https://console.cloud.google.com/');
          console.error('   4. Restart the development server');
        }

        console.log('✅ AuthContext: Authentication initialization complete');
      };

    initializeAuth();
  }, []);

  const handleGoogleSuccess = async (credential: string): Promise<boolean> => {
    try {

      const response = await unifiedApiClient.loginWithGoogle({
        token: credential // ✅ Backend expects exactly this format!
      });

      // Log backend response for debugging
      console.log('📥 Backend Response:', response);

      if (response.status === 1 && response.data) {
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

        // Load user's pets after successful login
        setTimeout(() => {
          refreshUserPets().catch(error =>
            console.warn('⚠️ Failed to load user pets after login:', error)
          );
        }, 100);
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

  const login = async (email: string, password: string): Promise<void> => {
    console.log('🔐 AuthContext: Starting email/password login...');
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Use the unified API client for email/password authentication
      const response = await unifiedApiClient.emailLogin({
        email,
        pwd: password // Note: backend uses 'pwd' not 'password'
      });

      if (response.status === 1 && response.data) {
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

        // Load user's pets after successful login
        setTimeout(() => {
          refreshUserPets().catch(error =>
            console.warn('⚠️ Failed to load user pets after login:', error)
          );
        }, 100);
      } else {
        console.error('❌ AuthContext: SDK login failed:', response.message);
        setState(prev => ({ ...prev, isLoading: false }));
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    if (!googleAuthService.isLoaded()) {
      console.error('❌ Google Auth Service not loaded');
      throw new Error('Google Auth Service not loaded');
    }

    if (!validateGoogleConfig()) {
      console.error('❌ Google OAuth not configured properly');
      throw new Error('Google OAuth not configured properly');
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await new Promise<void>((resolve, reject) => {
        googleAuthService.authenticateWithButton({
          onSuccess: async (credential: string) => {
            console.log('🎉 Google authentication success, processing credential...')
            try {
              const success = await handleGoogleSuccess(credential);
              if (success) {
                resolve();
              } else {
                reject(new Error('Google login failed in handleGoogleSuccess'));
              }
            } catch (error) {
              reject(error);
            }
          },
          onError: (error: string) => {
            console.error('❌ Google authentication failed:', error);
            handleGoogleError(error);
            reject(new Error(error));
          }
        });
      });
    } catch (error) {
      console.error('❌ Critical error in loginWithGoogle:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<void> => {
    console.log('📝 AuthContext: Starting user registration...');
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await authService.signupWithEmail({
        name,
        email,
        pwd: password
      });

      console.log('✅ AuthContext: User registration successful:', result);

      // Registration successful, but user still needs to login
      // Reset loading state
      setState(prev => ({ ...prev, isLoading: false }));

      console.log('🎯 AuthContext: Registration completed successfully');
    } catch (error) {
      console.error('❌ AuthContext: Registration error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = () => {
    console.log('🚪 AuthContext: Starting logout (local cleanup only)...');

    // Clear all authentication data using token storage
    tokenStorage.clearAll();
    localStorage.removeItem('petcare_selected_pet');

    // Update context state
    setState({
      user: null,
      selectedPet: null,
      userPets: null,
      isAuthenticated: false,
      isLoading: false
    });

    console.log('✅ AuthContext: Logout completed successfully (local cleanup only)');
  };

  const selectPet = useCallback((pet: Pet) => {
    setState(prev => ({
      ...prev,
      selectedPet: pet
    }));

    // Save to localStorage
    localStorage.setItem('petcare_selected_pet', JSON.stringify(pet));
  }, []);

  const getUserPets = useCallback((): PetAccess[] => {
    if (!state.user || !state.userPets) return [];
    return state.userPets;
  }, [state.user, state.userPets]);

  const refreshUserPets = useCallback(async (): Promise<void> => {
    if (!state.user) return;

    try {
      console.log('🔄 Refreshing user pets...');
      const response = await unifiedApiClient.getAccessiblePets();

      if (response.status === 1 && response.data) {
        // Convert Pet[] to PetAccess[] with basic role assignments
        const petAccessList: PetAccess[] = response.data.map((apiPet: any) => {
          // Convert API Pet format to local Pet format
          const pet: Pet = {
            ...apiPet,
            breed: apiPet.breed || '',
            // Computed fields for backward compatibility
            weight: apiPet.current_weight_kg,
            targetWeight: apiPet.target_weight_kg,
            dailyCalorieGoal: apiPet.daily_calorie_target,
            photo: apiPet.photo_url,
            ownerId: apiPet.owner_id
          };

          return {
            petId: pet.id,
            userId: state.user?.id || '',
            pet: pet,
            role: pet.owner_id === state.user?.id ? 'Creator' : 'Member',
          };
        });

        setState(prev => ({ ...prev, userPets: petAccessList }));
        console.log('✅ User pets refreshed:', petAccessList);
      } else {
        console.warn('⚠️ No pets found or empty response');
        setState(prev => ({ ...prev, userPets: [] }));
      }
    } catch (error) {
      console.error('❌ Failed to refresh user pets:', error);
      // Don't throw error to avoid breaking the UI
      setState(prev => ({ ...prev, userPets: [] }));
    }
  }, [state.user]);

  const createPet = useCallback(async (petData: any): Promise<Pet> => {
    try {
      console.log('🐾 Creating new pet...');
      const response = await unifiedApiClient.createPet(petData);

      if (response.status === 1 && response.data) {
        console.log('✅ Pet created successfully:', response.data);

        // Refresh pets list to include the new pet
        await refreshUserPets();

        // Convert API Pet format to local Pet format
        const apiPet = response.data;
        const pet: Pet = {
          ...apiPet,
          breed: apiPet.breed || '',
          // Computed fields for backward compatibility
          weight: apiPet.current_weight_kg,
          targetWeight: apiPet.target_weight_kg,
          dailyCalorieGoal: apiPet.daily_calorie_target,
          photo: apiPet.photo_url,
          ownerId: apiPet.owner_id
        };

        return pet;
      } else {
        throw new Error(response.message || 'Failed to create pet');
      }
    } catch (error) {
      console.error('❌ Pet creation failed:', error);
      throw error;
    }
  }, [refreshUserPets]);

  const contextValue: AuthContextType = {
    ...state,
    login,
    loginWithGoogle,
    signup,
    logout,
    selectPet,
    getUserPets,
    createPet,
    refreshUserPets
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
