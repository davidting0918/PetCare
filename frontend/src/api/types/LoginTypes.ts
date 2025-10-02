export interface EmailLoginRequest {
    email: string;
    pwd: string;
}

export interface GoogleLoginRequest {
    token: string;
}

export interface LoginResponse {
    access_token: string;
}