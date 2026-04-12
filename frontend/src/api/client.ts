import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

class ApiClient {
    private client: AxiosInstance;
    private baseUrl: string;
    private isHandling401 = false;
    private isRefreshing = false;
    private refreshPromise: Promise<string | null> | null = null;

    constructor(environment: string) {
        if (environment === 'prod') {
            this.baseUrl = import.meta.env.VITE_PROD_BASE_URL;
        } else if (environment === 'staging') {
            this.baseUrl = import.meta.env.VITE_STAGING_BASE_URL;
        } else {
            this.baseUrl = import.meta.env.VITE_TEST_BASE_URL;
        }

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 10000,
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        this.client.interceptors.request.use((config) => {
            if (!config.headers.Authorization) {
                const token = localStorage.getItem('petcare_token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }

            if (config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
                if (!(config.data instanceof FormData)) {
                    config.headers['Content-Type'] = 'application/json';
                    config.data = this.removeUndefined(config.data);
                }
            }

            return config;
        }, (error) => {
            return Promise.reject(error);
        });

        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

                if (error.response?.status === 401 && !originalRequest._retry) {
                    // Skip refresh for auth endpoints themselves
                    const isAuthEndpoint = originalRequest.url?.includes('/auth/');
                    if (isAuthEndpoint) {
                        return Promise.reject(error);
                    }

                    originalRequest._retry = true;

                    const refreshToken = localStorage.getItem('petcare_refresh_token');
                    if (refreshToken) {
                        try {
                            const newToken = await this.tryRefresh(refreshToken);
                            if (newToken) {
                                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                                return this.client(originalRequest);
                            }
                        } catch {
                            // Refresh failed — fall through to logout
                        }
                    }

                    // No refresh token or refresh failed — logout
                    if (!this.isHandling401) {
                        this.handle401Error();
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    private async tryRefresh(refreshToken: string): Promise<string | null> {
        // If already refreshing, wait for the in-progress refresh
        if (this.isRefreshing && this.refreshPromise) {
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        this.refreshPromise = this.doRefresh(refreshToken);

        try {
            const result = await this.refreshPromise;
            return result;
        } finally {
            this.isRefreshing = false;
            this.refreshPromise = null;
        }
    }

    private async doRefresh(refreshToken: string): Promise<string | null> {
        try {
            const response = await axios.post(`${this.baseUrl}/auth/token/refresh`, {
                refresh_token: refreshToken,
            });

            const data = response.data;
            if (data.status === 1 && data.data) {
                localStorage.setItem('petcare_token', data.data.access_token);
                localStorage.setItem('petcare_refresh_token', data.data.refresh_token);
                return data.data.access_token;
            }
            return null;
        } catch {
            // Refresh token is invalid/expired — clear it
            localStorage.removeItem('petcare_refresh_token');
            return null;
        }
    }

    private handle401Error() {
        if (this.isHandling401) return;
        this.isHandling401 = true;

        const currentPath = window.location.pathname;
        const isAuthPage = currentPath === '/login' || currentPath === '/signup';

        if (!isAuthPage) {
            localStorage.removeItem('petcare_token');
            localStorage.removeItem('petcare_refresh_token');
            localStorage.removeItem('petcare_user_id');
            localStorage.removeItem('petcare_user_email');
            localStorage.removeItem('petcare_user_name');
            localStorage.removeItem('petcare_user_picture');
            localStorage.removeItem('petcare_selected_pet');

            window.dispatchEvent(new CustomEvent('auth:logout'));
            window.location.href = '/login';
        }

        setTimeout(() => {
            this.isHandling401 = false;
        }, 1000);
    }

    getClient(): AxiosInstance {
        return this.client;
    }

    private removeUndefined<T>(data: T): T {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            if (value !== undefined) {
                cleaned[key] = value;
            }
        }
        return cleaned as T;
    }
}

export const apiClient = new ApiClient(import.meta.env.VITE_APP_ENV).getClient();
