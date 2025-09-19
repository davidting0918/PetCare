/**
 * API Endpoints Configuration
 * Centralized management of all API endpoints based on backend documentation
 * All API routes are defined here for easy maintenance
 *
 * Reference: backend/README.md API Documentation
 */

/**
 * API Base Configuration
 */
export const API_BASE = {
  // Production API URL
  PRODUCTION: 'https://api.petcare.com',
  // Development API URL
  DEVELOPMENT: 'http://localhost:8000',
  // Current environment URL
  CURRENT: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
} as const;

/**
 * API Endpoints Object
 * Contains all backend API endpoints organized by feature
 * Based on the official backend API documentation
 */
export const API_ENDPOINTS = {
  // Authentication endpoints (as documented in backend/README.md)
  AUTH: {
    // Email/password authentication
    EMAIL_LOGIN: '/auth/email/login',
    // Google OAuth 2.0 authorization code flow
    GOOGLE_LOGIN: '/auth/google/login',
    // OAuth2-compatible access token generation
    ACCESS_TOKEN: '/auth/access_token',
    // Logout (not implemented in backend - frontend handles local cleanup only)
    LOGOUT: '/auth/logout', // Not used - kept for reference only
  },

  // User management endpoints (as documented in backend/README.md)
  USER: {
    // Create new user account
    CREATE: '/user/create',
    // Get current authenticated user profile
    ME: '/user/me',
    // Update user profile information
    UPDATE: '/user/update',
    // Reset user password
    RESET_PASSWORD: '/user/reset_password',
  },

  // Pet management endpoints (as documented in backend/README.md)
  PETS: {
    // Create a new pet profile owned by the authenticated user
    CREATE: '/pets/create',
    // Retrieve all pets the current user can access across groups
    ACCESSIBLE: '/pets/accessible',
    // Get comprehensive information about a specific pet
    DETAILS: (petId: string) => `/pets/${petId}/details`,
    // Update pet information (owner permission required)
    UPDATE: (petId: string) => `/pets/${petId}/update`,
    // Soft delete a pet (owner permission required)
    DELETE: (petId: string) => `/pets/${petId}/delete`,
    // Assign pet to a different group
    ASSIGN_GROUP: (petId: string) => `/pets/${petId}/assign_group`,
    // Get pet's current group assignment information
    CURRENT_GROUP: (petId: string) => `/pets/${petId}/current_group`,
    // Upload or replace pet photo
    PHOTO_UPLOAD: (petId: string) => `/pets/${petId}/photo/upload`,
    // Serve pet photos with permission-controlled access
    PHOTO_SERVE: (petId: string) => `/pets/photos/${petId}`,
  },

  // Group management endpoints (as documented in backend/README.md)
  GROUPS: {
    // Create a new group for family pet care collaboration
    CREATE: '/groups/create',
    // Generate invitation code for joining the group
    INVITE: (groupId: string) => `/groups/${groupId}/invite`,
    // Join a group using invitation code
    JOIN: '/groups/join',
    // Retrieve all groups where user is a member
    MY_GROUPS: '/groups/my_groups',
    // List all members of a specific group
    MEMBERS: (groupId: string) => `/groups/${groupId}/members`,
    // Update member roles (creator permission required)
    UPDATE_ROLE: (groupId: string) => `/groups/${groupId}/update_role`,
    // Remove member from group (creator permission required)
    REMOVE_MEMBER: (groupId: string) => `/groups/${groupId}/remove`,
    // Retrieve all pets assigned to the group
    PETS: (groupId: string) => `/groups/${groupId}/pets`,
  },

  // Food database endpoints (as documented in backend/README.md)
  FOODS: {
    // Add new food item to group's collaborative database
    CREATE: '/foods/create',
    // Retrieve all foods available in specified group
    LIST: '/foods/list',
    // Search for foods within group using text queries
    SEARCH: '/foods/info',
    // Get comprehensive food information and nutritional data
    DETAILS: (foodId: string) => `/foods/${foodId}/details`,
    // Update existing food information
    UPDATE: (foodId: string) => `/foods/${foodId}/update`,
    // Soft delete food item from group database
    DELETE: (foodId: string) => `/foods/${foodId}/delete`,
    // Upload or replace food identification photo
    PHOTO_UPLOAD: (foodId: string) => `/foods/${foodId}/photo`,
    // Serve food photos with access control
    PHOTO_SERVE: (foodId: string) => `/foods/photos/${foodId}`,
    // Remove food identification photo
    PHOTO_DELETE: (foodId: string) => `/foods/${foodId}/photo/delete`,
  },

  // Meal tracking endpoints (as documented in backend/README.md)
  MEALS: {
    // Record new feeding session with automatic nutritional calculations
    CREATE: '/meals',
    // Retrieve feeding records with comprehensive filtering options
    LIST: '/meals',
    // Get detailed information about specific meal record
    DETAILS: (mealId: string) => `/meals/${mealId}/details`,
    // Update existing meal record with recalculation
    UPDATE: (mealId: string) => `/meals/${mealId}/update`,
    // Soft delete meal record while preserving statistics
    DELETE: (mealId: string) => `/meals/${mealId}/delete`,
    // Get current day's feeding summary and progress
    TODAY: '/meals/today',
    // Generate comprehensive feeding statistics and analytics
    SUMMARY: '/meals/summary',
  },

  // Weight tracking endpoints
  WEIGHT: {
    RECORDS: (petId: string) => `/pets/${petId}/weight-records`,
    CREATE_RECORD: (petId: string) => `/pets/${petId}/weight-records`,
    UPDATE_RECORD: (petId: string, recordId: string) => `/pets/${petId}/weight-records/${recordId}`,
    DELETE_RECORD: (petId: string, recordId: string) => `/pets/${petId}/weight-records/${recordId}`,
    GOALS: (petId: string) => `/pets/${petId}/weight-goals`,
    SET_GOAL: (petId: string) => `/pets/${petId}/weight-goals`,
  },

  // Analytics and reports endpoints
  ANALYTICS: {
    DASHBOARD: (petId: string) => `/pets/${petId}/analytics`,
    MEAL_TRENDS: (petId: string) => `/pets/${petId}/analytics/meals`,
    WEIGHT_TRENDS: (petId: string) => `/pets/${petId}/analytics/weight`,
    NUTRITION: (petId: string) => `/pets/${petId}/analytics/nutrition`,
  },

  // File upload endpoints
  UPLOADS: {
    AVATAR: '/uploads/avatar',
    PET_PHOTO: '/uploads/pet-photo',
    FOOD_IMAGE: '/uploads/food-image',
  },

  // System endpoints
  SYSTEM: {
    HEALTH: '/health',
    VERSION: '/version',
    SETTINGS: '/settings',
  },
} as const;

/**
 * API Configuration
 * Environment-based configuration for API client
 * Uses the API_BASE configuration above
 */
export const API_CONFIG = {
  // Base URL configuration - uses centralized API_BASE
  BASE_URL: API_BASE.CURRENT,

  // Request timeout settings
  TIMEOUT: {
    DEFAULT: 30000, // 30 seconds
    UPLOAD: 60000,  // 60 seconds for file uploads
    SHORT: 10000,   // 10 seconds for quick operations
  },

  // Retry configuration
  RETRY: {
    ATTEMPTS: 3,
    DELAY: 1000, // 1 second base delay
    BACKOFF_MULTIPLIER: 2, // Exponential backoff
  },

  // Development settings
  DEBUG: {
    ENABLE_LOGGING: import.meta.env.DEV || false,
    LOG_REQUESTS: import.meta.env.VITE_LOG_API_REQUESTS === 'true',
    LOG_RESPONSES: import.meta.env.VITE_LOG_API_RESPONSES === 'true',
  },
} as const;

/**
 * HTTP Status Codes
 * Common HTTP status codes used throughout the application
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Content Types
 * Common content types for API requests
 */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
} as const;

/**
 * Helper function to build dynamic endpoints
 * Ensures type safety when constructing parameterized URLs
 */
export function buildEndpoint(template: string, params: Record<string, string | number>): string {
  let url = template;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, String(value));
  }
  return url;
}

/**
 * Validate endpoint configuration
 * Development helper to ensure all endpoints are properly configured
 */
export function validateEndpoints(): boolean {
  const requiredEndpoints = [
    API_ENDPOINTS.AUTH.EMAIL_LOGIN,
    API_ENDPOINTS.PETS.ACCESSIBLE,
    API_ENDPOINTS.MEALS.LIST,
    API_ENDPOINTS.FOODS.LIST,
  ];

  const missing = requiredEndpoints.filter(endpoint => !endpoint);

  if (missing.length > 0) {
    console.error('❌ Missing required endpoints:', missing);
    return false;
  }

  if (API_CONFIG.DEBUG.ENABLE_LOGGING) {
    console.log('✅ All endpoints validated successfully');
    console.log('🔧 API Configuration:', {
      baseUrl: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT.DEFAULT,
      retryAttempts: API_CONFIG.RETRY.ATTEMPTS,
    });
  }

  return true;
}
