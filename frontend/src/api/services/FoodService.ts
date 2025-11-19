import { apiClient } from "../client";
import type {
    CreateFoodRequest,
    UpdateFoodRequest,
    FoodInfo,
    FoodDetails,
    FoodSearchResult,
    FoodType,
    TargetPet,
    ApiResponse
} from "../../types";

class FoodService {
    private basePath = '/foods';

    async createFood(groupId: string, request: CreateFoodRequest): Promise<ApiResponse<FoodDetails>> {
        const response = await apiClient.post(`${this.basePath}/create`, request, {
            params: { group_id: groupId }
        });
        return response.data;
    }

    async getFoodDetails(foodId: string): Promise<ApiResponse<FoodDetails>> {
        const response = await apiClient.get(`${this.basePath}/${foodId}/details`);
        return response.data;
    }

    async updateFood(foodId: string, request: UpdateFoodRequest): Promise<ApiResponse<FoodDetails>> {
        const response = await apiClient.post(`${this.basePath}/${foodId}/update`, request);
        return response.data;
    }

    async deleteFood(foodId: string): Promise<ApiResponse<any>> {
        const response = await apiClient.post(`${this.basePath}/${foodId}/delete`);
        return response.data;
    }

    async getGroupFoods(
        groupId: string,
        foodType?: FoodType,
        targetPet?: TargetPet
    ): Promise<ApiResponse<FoodInfo[]>> {
        const params: any = { group_id: groupId };
        if (foodType) params.food_type = foodType;
        if (targetPet) params.target_pet = targetPet;
        // Don't include keyword parameter to get all foods

        const response = await apiClient.get(`${this.basePath}/info`, { params });
        return response.data;
    }

    async searchFoods(
        groupId: string,
        keyword: string,
        foodType?: FoodType,
        targetPet?: TargetPet
    ): Promise<ApiResponse<FoodSearchResult[]>> {
        const params: any = { group_id: groupId, keyword };
        if (foodType) params.food_type = foodType;
        if (targetPet) params.target_pet = targetPet;

        const response = await apiClient.get(`${this.basePath}/info`, { params });
        return response.data;
    }

    async uploadFoodPhoto(foodId: string, file: File): Promise<ApiResponse<any>> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post(`${this.basePath}/${foodId}/photo/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    async deleteFoodPhoto(foodId: string): Promise<ApiResponse<any>> {
        const response = await apiClient.post(`${this.basePath}/${foodId}/photo/delete`);
        return response.data;
    }
}

export const foodService = new FoodService();
