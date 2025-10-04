import axios, { type AxiosInstance } from 'axios';

class ApiClient {
    private client: AxiosInstance;
    private baseUrl: string;

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

        // request interceptor
        this.client.interceptors.request.use((config) => {
            // 如果請求已經有 Authorization header，保持不變（支援 API Key 認證）
            if (!config.headers.Authorization) {
                const token = localStorage.getItem('petcare_token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }
            return config;
        }, (error) => {
            return Promise.reject(error);
        });

        // need to add token expiration handling
    }

    getClient(): AxiosInstance {
        return this.client;
    }
}

export const apiClient = new ApiClient("staging").getClient();
