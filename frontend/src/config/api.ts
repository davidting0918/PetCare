const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  AUTH: {
    GOOGLE_AUTH: `${API_BASE_URL}/auth/google/login`,
    USER: `${API_BASE_URL}/auth/user`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  }
} as const;

export { API_BASE_URL };