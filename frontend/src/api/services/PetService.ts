import { apiClient } from "../client";
import type { CreatePetRequest, PetInfo, ApiResponse } from "../../types";

class PetService {
    private basePath = '/pets';

    async createPet(request: CreatePetRequest): Promise<ApiResponse<PetInfo>> {

        const response = await apiClient.post(`${this.basePath}/create`, request);
        return response.data;
    }

    async getAccessiblePets(): Promise<ApiResponse<PetInfo[]>> {
        const response = await apiClient.get(`${this.basePath}/accessible`);
        return response.data;
    }

    async deletePet(petId: string): Promise<ApiResponse<null>> {
        const response = await apiClient.post(`${this.basePath}/${petId}/delete`);
        return response.data;
    }
}

export const petService = new PetService();
