import axios, { type AxiosInstance } from 'axios';

class ApiClient {
    private client: AxiosInstance;
    private baseUrl: string;
    private isHandling401 = false; // 防止重複處理 401

    constructor(environment: string) {
        if (environment === 'prod') {
            this.baseUrl = 'https://api.petcare.com';
        } else if (environment === 'staging') {
            this.baseUrl = 'http://localhost:8000';
        } else {
            this.baseUrl = 'http://localhost:8000';
        }

        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request interceptor - 添加認證token
        this.client.interceptors.request.use((config) => {
            if (!config.headers.Authorization) {
                const token = localStorage.getItem('petcare_token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }
            if (config.data && ['post'].includes(config.method?.toLowerCase() || '')) {
                config.data = this.removeUndefined(config.data);
            }
            return config;
        }, (error) => {
            return Promise.reject(error);
        });

        // Response interceptor - 處理 401 錯誤
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
        // 防止重複處理
        if (this.isHandling401) return;
        this.isHandling401 = true;

        // 檢查是否為登錄/註冊相關的 API 調用
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath === '/login' || currentPath === '/signup';

        // 如果不是在認證頁面，則執行自動登出
        if (!isAuthPage) {
            console.log('🔒 ApiClient: 401 detected, clearing auth and redirecting to login');

            // 清理本地儲存
            localStorage.removeItem('petcare_token');
            localStorage.removeItem('petcare_user_id');
            localStorage.removeItem('petcare_user_email');
            localStorage.removeItem('petcare_user_name');
            localStorage.removeItem('petcare_selected_pet');

            // 觸發 Redux logout action (通過自定義事件)
            window.dispatchEvent(new CustomEvent('auth:logout'));

            // 跳轉到登錄頁面
            window.location.href = '/login';
        }

        // 重置標誌
        setTimeout(() => {
            this.isHandling401 = false;
        }, 1000);
    }

    getClient(): AxiosInstance {
        return this.client;
    }

    private removeUndefined(data: any): any {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const cleaned: any = {};
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined ) {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }
}

export const apiClient = new ApiClient("staging").getClient();
