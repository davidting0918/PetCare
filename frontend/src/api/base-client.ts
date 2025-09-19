/**
 * Base API Client
 * Handles common HTTP operations, authentication, and error handling
 */

import type {
  ApiRequestConfig,
  ApiResponse,
  ApiError,
  ApiConfig,
  TokenStorage
} from './types';

export class BaseApiClient {
  private config: ApiConfig;
  private tokenStorage: TokenStorage;

  constructor(config: ApiConfig, tokenStorage: TokenStorage) {
    this.config = config;
    this.tokenStorage = tokenStorage;
  }

  /**
   * Make HTTP request with built-in error handling and retry logic
   */
  public async request<T>(requestConfig: ApiRequestConfig): Promise<ApiResponse<T>> {
    const { method, url, data, params, headers = {}, timeout, requiresAuth = true } = requestConfig;

    // Build full URL
    const fullUrl = this.buildUrl(url, params);

    // Prepare headers
    const requestHeaders = this.buildHeaders(headers, requiresAuth);

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: timeout ? AbortSignal.timeout(timeout) : AbortSignal.timeout(this.config.timeout),
    };

    // Add body for non-GET requests
    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data);
    }

    if (this.config.enableLogging) {
      console.log(`🌐 API Request: ${method} ${fullUrl}`, {
        headers: requestHeaders,
        data,
        requiresAuth
      });
    }

    return this.executeWithRetry(fullUrl, requestOptions);
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(url: string, options: RequestInit): Promise<ApiResponse<T>> {
    let lastError: ApiError | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, options);
        return await this.handleResponse<T>(response);
      } catch (error) {
        lastError = this.createApiError(error);

        if (this.config.enableLogging) {
          console.warn(`🔄 API Request failed (attempt ${attempt}/${this.config.retryAttempts}):`, lastError);
        }

        // Don't retry on authentication errors or client errors (4xx)
        if (lastError.status && (lastError.status === 401 || (lastError.status >= 400 && lastError.status < 500))) {
          break;
        }

        // Wait before retrying (unless it's the last attempt)
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    // All attempts failed
    throw lastError;
  }

  /**
   * Handle HTTP response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type') || '';
    let responseData: any;

    try {
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
    } catch (error) {
      throw this.createApiError(new Error('Failed to parse response'), response.status);
    }

    if (this.config.enableLogging) {
      console.log(`📨 API Response: ${response.status}`, responseData);
    }

    // Handle authentication errors
    if (response.status === 401) {
      this.tokenStorage.removeToken();
      this.tokenStorage.removeRefreshToken();

      throw this.createApiError(
        new Error('Authentication required'),
        401,
        'UNAUTHORIZED'
      );
    }

    // Handle other HTTP errors
    if (!response.ok) {
      const error = responseData?.message || responseData?.error || 'Request failed';
      throw this.createApiError(
        new Error(error),
        response.status,
        responseData?.code
      );
    }

    // Handle backend API response format (status: 1 = success, 0 = error)
    if (responseData && typeof responseData === 'object') {
      // Check if it's the backend's documented response format
      if ('status' in responseData) {
        return responseData as ApiResponse<T>;
      }
      // Check if it's our legacy format
      else if ('success' in responseData) {
        // Convert legacy format to new format for backward compatibility
        return {
          status: responseData.success ? 1 : 0,
          data: responseData.data,
          message: responseData.message
        } as ApiResponse<T>;
      }
      // Raw data without wrapper
      else {
        return {
          status: 1,
          data: responseData as T,
          message: 'Request successful'
        };
      }
    } else {
      // Simple data response
      return {
        status: 1,
        data: responseData as T,
        message: 'Request successful'
      };
    }
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const baseUrl = this.config.baseUrl.endsWith('/')
      ? this.config.baseUrl.slice(0, -1)
      : this.config.baseUrl;

    const url = endpoint.startsWith('/')
      ? `${baseUrl}${endpoint}`
      : `${baseUrl}/${endpoint}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      return `${url}?${searchParams.toString()}`;
    }

    return url;
  }

  /**
   * Build request headers
   */
  private buildHeaders(customHeaders: Record<string, string>, requiresAuth: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders
    };

    // Add authentication header if required
    if (requiresAuth) {
      const token = this.tokenStorage.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Create standardized API error
   */
  private createApiError(error: any, status?: number, code?: string): ApiError {
    return {
      code: code || 'API_ERROR',
      message: error?.message || 'An unexpected error occurred',
      details: error,
      status: status || 500
    };
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration
   */
  public getConfig(): ApiConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Convenience methods for different HTTP verbs
  public async get<T>(url: string, params?: Record<string, any>, options?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', url, params, ...options });
  }

  public async post<T>(url: string, data?: any, options?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', url, data, ...options });
  }
}
