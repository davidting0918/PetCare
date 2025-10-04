import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { User, Pet, PetAccess } from '../../types';
import { authService } from '../../api/services';
import { userService } from '../../api/services';

// 定義 Auth State 介面
interface AuthState {
  user: User | null;
  selectedPet: Pet | null;
  userPets: PetAccess[] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// 初始狀態
const initialState: AuthState = {
  user: null,
  selectedPet: null,
  userPets: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async Thunks for API calls
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, pwd }: { email: string; pwd: string }, { rejectWithValue }) => {
    try {
      console.log('🔐 Redux Auth: Starting email/password login...');

      const response = await authService.emailLogin({
        email,
        pwd
      });

      if (response.status === 1 && response.data) {
        // Store token in localStorage
        localStorage.setItem('petcare_token', response.data.access_token);
        localStorage.setItem('petcare_user_id', response.data.user.id);
        localStorage.setItem('petcare_user_email', response.data.user.email);
        localStorage.setItem('petcare_user_name', response.data.user.name);

        console.log('✅ Redux Auth: Login successful');
        return response.data;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('❌ Redux Auth: Login failed:', error);
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const signupUser = createAsyncThunk(
  'auth/signupUser',
  async ({ name, email, pwd }: { name: string; email: string; pwd: string }, { rejectWithValue }) => {
    try {
      console.log('📝 Redux Auth: Starting user registration...');

      const response = await userService.createUser({
        name,
        email,
        pwd
      });

      console.log('✅ Redux Auth: Registration successful');
      return response;
    } catch (error: any) {
      console.error('❌ Redux Auth: Registration failed:', error);
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const initializeAuth = createAsyncThunk(
  'auth/initializeAuth',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Redux Auth: Initializing authentication...');

      const token = localStorage.getItem('petcare_token');
      const userId = localStorage.getItem('petcare_user_id');
      const userEmail = localStorage.getItem('petcare_user_email');
      const userName = localStorage.getItem('petcare_user_name');

      if (token && userId && userEmail && userName) {
        console.log('🔍 Redux Auth: Found existing session');
        return { user: { id: userId, email: userEmail, name: userName } };
      } else {
        console.log('ℹ️ Redux Auth: No existing session found');
        return null;
      }
    } catch (error: any) {
      console.error('❌ Redux Auth: Initialization failed:', error);
      return rejectWithValue(error.message || 'Initialization failed');
    }
  }
);

// Auth Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      console.log('🚪 Redux Auth: Starting logout...');

      // Clear localStorage
      localStorage.removeItem('petcare_token');
      localStorage.removeItem('petcare_user_id');
      localStorage.removeItem('petcare_user_email');
      localStorage.removeItem('petcare_user_name');
      localStorage.removeItem('petcare_selected_pet');

      // Reset state
      state.user = null;
      state.selectedPet = null;
      state.userPets = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;

      console.log('✅ Redux Auth: Logout completed');
    },
    selectPet: (state, action: PayloadAction<Pet>) => {
      console.log('🐕 Redux Auth: Selecting pet:', action.payload.name);
      state.selectedPet = action.payload;
      localStorage.setItem('petcare_selected_pet', JSON.stringify(action.payload));
    },
    clearError: (state) => {
      state.error = null;
    },
    setUserPets: (state, action: PayloadAction<PetAccess[]>) => {
      state.userPets = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login User
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Signup User
    builder
      .addCase(signupUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Initialize Auth
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload.user;
          state.selectedPet = null;
          state.isAuthenticated = true;
        }
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, selectPet, clearError, setUserPets } = authSlice.actions;
export default authSlice.reducer;
