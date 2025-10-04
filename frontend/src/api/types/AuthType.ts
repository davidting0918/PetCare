export interface EmailLoginRequest {
    email: string;
    pwd: string;
}

export interface GoogleLoginRequest {
    token: string;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: {
        id: string;
        email: string;
        name: string;
    }
}

export interface SignupRequest {
    name: string;
    email: string;
    pwd: string;
}
