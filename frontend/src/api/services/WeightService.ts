import { apiClient } from "../client";
import type {
    CreateWeightRequest,
    UpdateWeightRequest,
    WeightRecord,
    ApiResponse,
    SearchWeightRecordsRequest,
    SearchWeightRecordsResponse
} from "../../types";

class WeightService {
    private basePath = '/weights';

    async createWeight(request: CreateWeightRequest): Promise<ApiResponse<WeightRecord>> {
        const response = await apiClient.post(`${this.basePath}/create`, request);
        return response.data;
    }

    async updateWeight(weightId: string, request: UpdateWeightRequest): Promise<ApiResponse<WeightRecord>> {
        const response = await apiClient.post(`${this.basePath}/update/${weightId}`, request);
        return response.data;
    }

    async getWeightRecords(
        petId: string,
        params?: Omit<SearchWeightRecordsRequest, 'pet_id'>
    ): Promise<ApiResponse<SearchWeightRecordsResponse>> {
        const queryParams: SearchWeightRecordsRequest = {
            pet_id: petId,
            number: 10, // Default to last 10 records
            order_by: 'timestamp',
            order_direction: 'desc',
            page: 1,
            ...params
        };

        const response = await apiClient.get(`${this.basePath}/info`, { params: queryParams });
        return response.data;
    }
}

export const weightService = new WeightService();
