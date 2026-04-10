import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../redux';
import {
  fetchMedications,
  createMedication,
  updateMedication,
  deleteMedication as deleteMedicationAction,
  fetchCourses,
  createCourse,
  endCourse,
  fetchTodaySchedule,
  createLog,
  deleteLog as deleteLogAction,
} from '../../store';
import type {
  CreateMedicationRequest,
  UpdateMedicationRequest,
  CreateCourseRequest,
  CreateLogRequest,
  MedicationInfo,
  TreatmentCourseInfo,
  TodayScheduleResponse,
} from '../../types';

export const useMedicine = () => {
  const dispatch = useAppDispatch();
  const medicineState = useAppSelector((state) => state.medicine);

  // ===== Medication operations =====

  const getMedications = useCallback(async (groupId: string) => {
    const result = await dispatch(fetchMedications({ groupId }));
    if (fetchMedications.rejected.match(result)) {
      const payload = result.payload as { groupId: string; error: string };
      throw new Error(payload.error);
    }
  }, [dispatch]);

  const addMedication = useCallback(async (request: CreateMedicationRequest) => {
    const result = await dispatch(createMedication(request));
    if (createMedication.rejected.match(result)) {
      const payload = result.payload as { groupId: string; error: string };
      throw new Error(payload.error);
    }
  }, [dispatch]);

  const editMedication = useCallback(async (medicationId: string, groupId: string, request: UpdateMedicationRequest) => {
    const result = await dispatch(updateMedication({ medicationId, groupId, request }));
    if (updateMedication.rejected.match(result)) {
      const payload = result.payload as { groupId: string; error: string };
      throw new Error(payload.error);
    }
  }, [dispatch]);

  const deleteMedication = useCallback(async (medicationId: string, groupId: string) => {
    const result = await dispatch(deleteMedicationAction({ medicationId, groupId }));
    if (deleteMedicationAction.rejected.match(result)) {
      const payload = result.payload as { groupId: string; error: string };
      throw new Error(payload.error);
    }
  }, [dispatch]);

  const getCachedMedications = useCallback((groupId: string): MedicationInfo[] => {
    return medicineState.medications[groupId] || [];
  }, [medicineState.medications]);

  // ===== Course operations =====

  const getCourses = useCallback(async (petId: string, status?: string) => {
    const result = await dispatch(fetchCourses({ petId, status }));
    if (fetchCourses.rejected.match(result)) {
      const payload = result.payload as { petId: string; error: string };
      throw new Error(payload.error);
    }
  }, [dispatch]);

  const addCourse = useCallback(async (request: CreateCourseRequest) => {
    const result = await dispatch(createCourse(request));
    if (createCourse.rejected.match(result)) {
      const payload = result.payload as { petId: string; error: string };
      throw new Error(payload.error);
    }
  }, [dispatch]);

  const endTreatment = useCallback(async (courseId: string, petId: string, localDate?: string) => {
    const result = await dispatch(endCourse({ courseId, petId, localDate }));
    if (endCourse.rejected.match(result)) {
      const payload = result.payload as { petId: string; error: string };
      throw new Error(payload.error);
    }
  }, [dispatch]);

  const getCachedCourses = useCallback((petId: string): TreatmentCourseInfo[] => {
    return medicineState.courses[petId] || [];
  }, [medicineState.courses]);

  // ===== Today schedule operations =====

  const getTodaySchedule = useCallback(async (petId: string, localDate?: string) => {
    const result = await dispatch(fetchTodaySchedule({ petId, localDate }));
    if (fetchTodaySchedule.rejected.match(result)) {
      const payload = result.payload as { petId: string; error: string };
      throw new Error(payload.error);
    }
  }, [dispatch]);

  const markDone = useCallback(async (request: CreateLogRequest) => {
    const result = await dispatch(createLog(request));
    if (createLog.rejected.match(result)) {
      const payload = result.payload as { petId: string; error: string };
      throw new Error(payload.error);
    }
  }, [dispatch]);

  const undoMarkDone = useCallback(async (logId: string, petId: string) => {
    const result = await dispatch(deleteLogAction({ logId, petId }));
    if (deleteLogAction.rejected.match(result)) {
      const payload = result.payload as { petId: string; error: string };
      throw new Error(payload.error);
    }
  }, [dispatch]);

  const getCachedTodaySchedule = useCallback((petId: string): TodayScheduleResponse | null => {
    return medicineState.todaySchedule[petId] || null;
  }, [medicineState.todaySchedule]);

  // ===== Loading / Error =====

  const isLoading = useCallback((key: string): boolean => {
    return medicineState.isLoading[key] || false;
  }, [medicineState.isLoading]);

  const getError = useCallback((key: string): string | null => {
    return medicineState.error[key] || null;
  }, [medicineState.error]);

  return {
    // Medications
    getMedications,
    addMedication,
    editMedication,
    deleteMedication,
    getCachedMedications,
    // Courses
    getCourses,
    addCourse,
    endTreatment,
    getCachedCourses,
    // Today schedule
    getTodaySchedule,
    markDone,
    undoMarkDone,
    getCachedTodaySchedule,
    // Loading / Error
    isLoading,
    getError,
  };
};
