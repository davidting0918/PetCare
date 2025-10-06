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

        // need to add token expiration handling
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
        console.log(cleaned);
        return cleaned;
    }
}

export const apiClient = new ApiClient("staging").getClient();
