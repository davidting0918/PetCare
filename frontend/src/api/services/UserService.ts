import { apiClient } from "../client";
import { type CreateUserRequest } from "../types/UserType";
import { type ApiResponse, type UserInfo } from "../types";

class UserService {
    private basePath = '/user';

    async createUser(request: CreateUserRequest): Promise<ApiResponse<UserInfo>> {
        const response = await apiClient.post(`${this.basePath}/create`, request, {
            headers: {
                'X-API-Key': `${localStorage.getItem('petcare_api_key')}:${localStorage.getItem('petcare_api_secret')}`
            }
        });
        return response.data;
    }
}

export const userService = new UserService();
