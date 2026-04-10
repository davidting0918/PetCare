import { apiClient } from '../client';
import type {
  CreateMedicationRequest,
  UpdateMedicationRequest,
  CreateCourseRequest,
  UpdateCourseRequest,
  CreateLogRequest,
  MedicationInfo,
  TreatmentCourseInfo,
  MedicationLogInfo,
  TodayScheduleResponse,
  ApiResponse,
} from '../../types';

class MedicineService {
  private basePath = '/medicine';

  // ===== Medication CRUD =====

  async createMedication(request: CreateMedicationRequest): Promise<ApiResponse<MedicationInfo>> {
    const response = await apiClient.post(`${this.basePath}/create`, request);
    return response.data;
  }

  async listMedications(groupId: string): Promise<ApiResponse<MedicationInfo[]>> {
    const response = await apiClient.get(`${this.basePath}/list`, { params: { group_id: groupId } });
    return response.data;
  }

  async getMedication(medicationId: string): Promise<ApiResponse<MedicationInfo>> {
    const response = await apiClient.get(`${this.basePath}/${medicationId}`);
    return response.data;
  }

  async updateMedication(medicationId: string, request: UpdateMedicationRequest): Promise<ApiResponse<MedicationInfo>> {
    const response = await apiClient.post(`${this.basePath}/${medicationId}/update`, request);
    return response.data;
  }

  async deleteMedication(medicationId: string): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
    const response = await apiClient.post(`${this.basePath}/${medicationId}/delete`);
    return response.data;
  }

  // ===== Treatment Course =====

  async createCourse(request: CreateCourseRequest): Promise<ApiResponse<TreatmentCourseInfo>> {
    const response = await apiClient.post(`${this.basePath}/course/create`, request);
    return response.data;
  }

  async updateCourse(courseId: string, request: UpdateCourseRequest): Promise<ApiResponse<TreatmentCourseInfo>> {
    const response = await apiClient.post(`${this.basePath}/course/${courseId}/update`, request);
    return response.data;
  }

  async endCourse(courseId: string, localDate?: string): Promise<ApiResponse<TreatmentCourseInfo>> {
    const response = await apiClient.post(
      `${this.basePath}/course/${courseId}/end`,
      null,
      { params: localDate ? { local_date: localDate } : {} },
    );
    return response.data;
  }

  async listCourses(petId: string, status?: string): Promise<ApiResponse<TreatmentCourseInfo[]>> {
    const response = await apiClient.get(`${this.basePath}/course/list`, {
      params: { pet_id: petId, status: status || 'active' },
    });
    return response.data;
  }

  // ===== Medication Log =====

  async createLog(request: CreateLogRequest): Promise<ApiResponse<MedicationLogInfo>> {
    const response = await apiClient.post(`${this.basePath}/log/create`, request);
    return response.data;
  }

  async deleteLog(logId: string): Promise<ApiResponse<{ id: string; deleted: boolean }>> {
    const response = await apiClient.post(`${this.basePath}/log/${logId}/delete`);
    return response.data;
  }

  // ===== Today's Schedule =====

  async getTodaySchedule(petId: string, localDate?: string): Promise<ApiResponse<TodayScheduleResponse>> {
    const response = await apiClient.get(`${this.basePath}/today`, {
      params: { pet_id: petId, ...(localDate ? { local_date: localDate } : {}) },
    });
    return response.data;
  }
}

export const medicineService = new MedicineService();
