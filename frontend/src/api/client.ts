import axios, { type AxiosInstance } from 'axios';

class ApiClient {
    private client: AxiosInstance;
    private baseUrl: string;
    private isHandling401 = false;

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
            // Don't set default Content-Type here
            // Let axios automatically set it based on request data
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        this.client.interceptors.request.use((config) => {
            // Add auth token if not present
            if (!config.headers.Authorization) {
                const token = localStorage.getItem('petcare_token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }

            // Only process JSON data, skip FormData (for file uploads)
            if (config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
                // Check if data is FormData (for file uploads)
                if (!(config.data instanceof FormData)) {
                    // Set Content-Type for JSON and clean undefined values
                    config.headers['Content-Type'] = 'application/json';
                    config.data = this.removeUndefined(config.data);
                }
                // If it's FormData, axios will automatically set the correct Content-Type with boundary
            }

            return config;
        }, (error) => {
            return Promise.reject(error);
        });

        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401 && !this.isHandling401) {
                    this.handle401Error();
                }
                return Promise.reject(error);
            }
        );
    }

    private handle401Error() {
        if (this.isHandling401) return;
        this.isHandling401 = true;

        const currentPath = window.location.pathname;
        const isAuthPage = currentPath === '/login' || currentPath === '/signup';

        if (!isAuthPage) {
            console.log('🔒 ApiClient: 401 detected, clearing auth and redirecting to login');

            // 清理本地儲存
            localStorage.removeItem('petcare_token');
            localStorage.removeItem('petcare_user_id');
            localStorage.removeItem('petcare_user_email');
            localStorage.removeItem('petcare_user_name');
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
        console.log(cleaned);
        return cleaned as T;
    }
}

export const apiClient = new ApiClient(import.meta.env.VITE_APP_ENV).getClient();
