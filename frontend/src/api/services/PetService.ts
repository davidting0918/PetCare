import { apiClient } from "../client";
import type { CreatePetRequest, PetInfo } from "../types/PetType";
import type { ApiResponse } from "../types";

class PetService {
    private basePath = '/pets';

    async createPet(request: CreatePetRequest): Promise<ApiResponse<PetInfo>> {
        const response = await apiClient.post(`${this.basePath}/create`, request);
        return response.data;
    }
}

export const petService = new PetService();
