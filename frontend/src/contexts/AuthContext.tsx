import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Pet, PetAccess, AppState } from '../types';
import { mockUsers, getUserAccessiblePets } from '../data/mockData';

interface AuthContextType extends AppState {
  login: (email: string) => Promise<boolean>;
  logout: () => void;
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

  // Check for saved session on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('petcare_user');
    const savedPet = localStorage.getItem('petcare_selected_pet');

    if (savedUser) {
      const user = JSON.parse(savedUser);
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        selectedPet: savedPet ? JSON.parse(savedPet) : null,
        isLoading: false
      }));
    } else {
      setState(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }, []);

  const login = async (email: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find user in mock data
    const user = mockUsers.find(u => u.email === email);

    if (user) {
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false
      }));

      // Save to localStorage
      localStorage.setItem('petcare_user', JSON.stringify(user));
      return true;
    }

    setState(prev => ({ ...prev, isLoading: false }));
    return false;
  };

  const logout = () => {
    setState({
      user: null,
      selectedPet: null,
      isAuthenticated: false,
      isLoading: false
    });

    // Clear localStorage
    localStorage.removeItem('petcare_user');
    localStorage.removeItem('petcare_selected_pet');
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
