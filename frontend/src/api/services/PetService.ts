import { apiClient } from "../client";
import type { CreatePetRequest, PetInfo, ApiResponse, UpdatePetRequest, PhotoUploadResponse } from "../../types";

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

    async updatePet(petId: string, request: UpdatePetRequest): Promise<ApiResponse<PetInfo>> {
        const response = await apiClient.post(`${this.basePath}/${petId}/update`, request);
        return response.data;
    }

    async uploadPetPhoto(petId: string, file: File): Promise<ApiResponse<PhotoUploadResponse>> {
        const formData = new FormData();
        formData.append('file', file);

        // Note: Don't set Content-Type header manually for FormData
        // Axios will automatically set it with the correct boundary
        const response = await apiClient.post(`${this.basePath}/${petId}/photo/upload`, formData);
        return response.data;
    }

    async deletePet(petId: string): Promise<ApiResponse<null>> {
        const response = await apiClient.post(`${this.basePath}/${petId}/delete`);
        return response.data;
    }

    async assignPetToGroup(petId: string, groupId: string | null): Promise<ApiResponse<unknown>> {
        const response = await apiClient.post(
            `${this.basePath}/${petId}/assign_group`,
            { group_id: groupId }
        );
        return response.data;
    }
}

export const petService = new PetService();
