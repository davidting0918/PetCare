import type { User } from './user';

// Auth Requests
export interface EmailLoginRequest {
  email: string;
  pwd: string;
}

export interface GoogleLoginRequest {
  token: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  pwd: string;
}


// Auth Responses
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    name: string;
  }
}

// App Auth State
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
