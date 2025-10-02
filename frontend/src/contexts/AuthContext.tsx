import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AppState } from '../types';
import { loginService } from '../api/services';

interface AuthContextType extends AppState {
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
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

  // Check for saved session on app load
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔄 AuthContext: Initializing authentication...');

      // Check for existing authentication using localStorage directly
      const token = localStorage.getItem('petcare_token');
      const savedUserStr = localStorage.getItem('petcare_user');
      const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
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

      console.log('✅ AuthContext: Authentication initialization complete');
    };

    initializeAuth();
  }, []);


  const login = async (email: string, password: string): Promise<void> => {
    console.log('🔐 AuthContext: Starting email/password login...');
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Use the login service for email/password authentication
      const response = await loginService.emailLogin({
        email,
        pwd: password // Note: backend uses 'pwd' not 'password'
      });

      if (response.status === 1 && response.data) {
        console.log('✅ AuthContext: SDK login successful');

        // Store token in localStorage
        localStorage.setItem('petcare_token', response.data.access_token);
        
        // Note: Your API may need to return user data in the response
        // For now, we'll store a basic user object - you may need to adjust this
        // based on what your backend actually returns
        const userData = {
          id: 'temp-id', // You may need to get this from another API endpoint
          email: email,
          name: 'User' // You may need to get this from another API endpoint or profile call
        };
        localStorage.setItem('petcare_user', JSON.stringify(userData));

        // Update context state
        setState(prev => ({
          ...prev,
          user: userData,
          isAuthenticated: true,
          isLoading: false
        }));

        console.log('🎯 AuthContext: Email login completed successfully');

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


  const signup = async (name: string, email: string, password: string): Promise<void> => {
    console.log('📝 AuthContext: Starting user registration...', { name, email, passwordLength: password.length });
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // TODO: Implement signup API call with the provided parameters
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ AuthContext: User registration successful');

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

    // Clear all authentication data from localStorage

    localStorage.removeItem('petcare_token');
    localStorage.removeItem('petcare_user');
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

  const contextValue: AuthContextType = {
    ...state,
    login,
    signup,
    logout,
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
