export interface ApiResponse<T> {
    status: number;
    data: T;
    message: string;
}

export * from './AuthType';
export * from './UserType';
