import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh and errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface GoogleAuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    picture: string;
  };
}

export const authService = {
  async googleAuth(authorizationCode: string, redirectUri?: string): Promise<GoogleAuthResponse> {
    const response = await apiClient.post('/auth/google/login', { 
      code: authorizationCode,
      redirect_uri: redirectUri || `${window.location.origin}/auth/callback`
    });
    return response.data.data; // Extract data from backend response format
  },

  async getCurrentUser() {
    const response = await apiClient.get('/auth/user');
    return response.data;
  },

  async logout() {
    const response = await apiClient.post('/auth/logout');
    localStorage.removeItem('access_token');
    return response.data;
  },
};

export default apiClient;
