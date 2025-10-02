export interface ApiResponse<T> {
    status: number;
    data: T;
    message: string;
}

export * from './LoginTypes';