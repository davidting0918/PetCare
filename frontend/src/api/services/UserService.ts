import { apiClient } from "../client";
import { type CreateUserRequest, type UserInfo, type ApiResponse, type UpdateUserInfoRequest, type PhotoUploadResponse } from "../../types";

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

    async updateUserInfo(request: UpdateUserInfoRequest): Promise<ApiResponse<UserInfo>> {
        const response = await apiClient.post(`${this.basePath}/update`, request);
        return response.data;
    }

    async uploadUserPhoto(file: File): Promise<ApiResponse<PhotoUploadResponse>> {
        const formData = new FormData();
        formData.append('file', file);

        // Note: Don't set Content-Type header manually for FormData
        // Axios will automatically set it with the correct boundary
        const response = await apiClient.post(`${this.basePath}/photo/upload`, formData);
        return response.data;
    }

    async resetPassword(oldPwd: string, newPwd: string): Promise<ApiResponse<UserInfo>> {
        const response = await apiClient.post(`${this.basePath}/reset_password`, {
            old_pwd: oldPwd,
            new_pwd: newPwd,
        });
        return response.data;
    }

    async getCurrentUser(): Promise<ApiResponse<UserInfo>> {
        const response = await apiClient.get(`${this.basePath}/me`);
        return response.data;
    }
}

export const userService = new UserService();
