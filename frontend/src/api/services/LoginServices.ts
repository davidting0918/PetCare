import { apiClient } from "../client";
import { type EmailLoginRequest, type LoginResponse } from "../types/LoginTypes";
import { type ApiResponse } from "../types";

class LoginService {
    private basePath = '/auth';

    async emailLogin(request: EmailLoginRequest): Promise<ApiResponse<LoginResponse>> {
        const response = await apiClient.post(`${this.basePath}/email/login`, request);
        return response.data;
    }
}

export const loginService = new LoginService();