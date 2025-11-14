import { apiClient } from "../client";
import type { EmailLoginRequest, GoogleLoginRequest, LoginResponse, ApiResponse } from "../../types";

class AuthService {
    private basePath = '/auth';

    async emailLogin(request: EmailLoginRequest): Promise<ApiResponse<LoginResponse>> {
        const response = await apiClient.post(`${this.basePath}/email/login`, request);
        return response.data;
    }

    async googleLogin(request: GoogleLoginRequest): Promise<ApiResponse<LoginResponse>> {
        const response = await apiClient.post(`${this.basePath}/google/login`, request);
        return response.data;
    }
}

export const authService = new AuthService();
