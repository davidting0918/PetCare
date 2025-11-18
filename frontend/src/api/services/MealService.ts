import { apiClient } from "../client";
import type {
    CreateMealRequest,
    UpdateMealRequest,
    MealInfo,
    MealDetails,
    TodayMealSummary,
    MealStatistics,
    MealQueryFilters,
    ApiResponse
} from "../../types";

class MealService {
    private basePath = '/meals';

    async createMeal(request: CreateMealRequest): Promise<ApiResponse<MealDetails>> {
        const response = await apiClient.post(`${this.basePath}`, request);
        return response.data;
    }

    async getMealRecords(filters: MealQueryFilters): Promise<ApiResponse<MealInfo[]>> {
        const response = await apiClient.get(`${this.basePath}`, { params: filters });
        return response.data;
    }

    async getMealDetails(mealId: string): Promise<ApiResponse<MealDetails>> {
        const response = await apiClient.get(`${this.basePath}/${mealId}/details`);
        return response.data;
    }

    async updateMeal(mealId: string, request: UpdateMealRequest): Promise<ApiResponse<MealDetails>> {
        const response = await apiClient.post(`${this.basePath}/${mealId}/update`, request);
        return response.data;
    }

    async deleteMeal(mealId: string): Promise<ApiResponse<any>> {
        const response = await apiClient.post(`${this.basePath}/${mealId}/delete`);
        return response.data;
    }

    async getTodayMeals(filters: Omit<MealQueryFilters, 'date_from' | 'date_to'>): Promise<ApiResponse<TodayMealSummary>> {
        const response = await apiClient.get(`${this.basePath}/today`, { params: filters });
        return response.data;
    }

    async getMealStatistics(filters: Required<Pick<MealQueryFilters, 'date_from' | 'date_to'>> & Omit<MealQueryFilters, 'limit' | 'offset'>): Promise<ApiResponse<MealStatistics>> {
        const response = await apiClient.get(`${this.basePath}/summary`, { params: filters });
        return response.data;
    }
}

export const mealService = new MealService();
