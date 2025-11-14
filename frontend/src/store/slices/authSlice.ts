import { createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import type { User } from '../../types';
import { authService } from '../../api';
import { userService } from '../../api';

// 定義 Auth State 介面
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// 初始狀態
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async Thunks for API calls
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, pwd }: { email: string; pwd: string }, { rejectWithValue }) => {
    try {

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

        return response.data;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const loginGoogleUser = createAsyncThunk(
  'auth/loginGoogleUser',
  async ({ token }: { token: string }, { rejectWithValue }) => {
    try {
      const response = await authService.googleLogin({
        token
      });

      if (response.status === 1 && response.data) {
        // Store token in localStorage
        localStorage.setItem('petcare_token', response.data.access_token);
        localStorage.setItem('petcare_user_id', response.data.user.id);
        localStorage.setItem('petcare_user_email', response.data.user.email);
        localStorage.setItem('petcare_user_name', response.data.user.name);

        return response.data;
      } else {
        throw new Error(response.message || 'Google login failed');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Google login failed');
    }
  }
);

export const signupUser = createAsyncThunk(
  'auth/signupUser',
  async ({ name, email, pwd }: { name: string; email: string; pwd: string }, { rejectWithValue }) => {
    try {

      const response = await userService.createUser({
        name,
        email,
        pwd
      });

      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

export const initializeAuth = createAsyncThunk(
  'auth/initializeAuth',
  async (_, { rejectWithValue }) => {
    try {

      const token = localStorage.getItem('petcare_token');
      const userId = localStorage.getItem('petcare_user_id');
      const userEmail = localStorage.getItem('petcare_user_email');
      const userName = localStorage.getItem('petcare_user_name');

      if (token && userId && userEmail && userName) {
        return { user: { id: userId, email: userEmail, name: userName } };
      } else {
        return null;
      }
    } catch (error: any) {
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
      // Clear localStorage
      localStorage.removeItem('petcare_token');
      localStorage.removeItem('petcare_user_id');
      localStorage.removeItem('petcare_user_email');
      localStorage.removeItem('petcare_user_name');
      localStorage.removeItem('petcare_selected_pet');

      // Reset state
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    }
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

    // Google Login User
    builder
      .addCase(loginGoogleUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginGoogleUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(loginGoogleUser.rejected, (state, action) => {
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
          state.isAuthenticated = true;
        }
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
