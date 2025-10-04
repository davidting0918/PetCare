import { apiClient } from "../client";
import { type CreateUserRequest } from "../types/UserType";
import { type ApiResponse, type UserInfo } from "../types";

class UserService {
    private basePath = '/user';

    async createUser(request: CreateUserRequest): Promise<ApiResponse<UserInfo>> {
        const response = await apiClient.post(`${this.basePath}/create`, request, {
            headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}:${import.meta.env.VITE_API_SECRET}`
            }
        });
        return response.data;
    }
}

export const userService = new UserService();
