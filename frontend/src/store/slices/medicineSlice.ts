import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type {
  MedicationInfo,
  TreatmentCourseInfo,
  TodayScheduleResponse,
  CreateMedicationRequest,
  UpdateMedicationRequest,
  CreateCourseRequest,
  CreateLogRequest,
} from '../../types';
import { medicineService } from '../../api';
import { logout } from './authSlice';

interface MedicineState {
  medications: Record<string, MedicationInfo[]>; // groupId -> MedicationInfo[]
  courses: Record<string, TreatmentCourseInfo[]>; // petId -> TreatmentCourseInfo[]
  todaySchedule: Record<string, TodayScheduleResponse>; // petId -> TodayScheduleResponse
  isLoading: Record<string, boolean>; // key -> loading state
  error: Record<string, string | null>; // key -> error message
}

const initialState: MedicineState = {
  medications: {},
  courses: {},
  todaySchedule: {},
  isLoading: {},
  error: {},
};

export const fetchMedications = createAsyncThunk(
  'medicine/fetchMedications',
  async ({ groupId }: { groupId: string }, { rejectWithValue }) => {
    try {
      const response = await medicineService.listMedications(groupId);
      if (response.status === 1 && response.data) {
        return { groupId, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to fetch medications');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch medications';
      return rejectWithValue({ groupId, error: message });
    }
  },
);

export const createMedication = createAsyncThunk(
  'medicine/createMedication',
  async (request: CreateMedicationRequest, { rejectWithValue }) => {
    try {
      const response = await medicineService.createMedication(request);
      if (response.status === 1 && response.data) {
        return { groupId: request.group_id, medication: response.data };
      } else {
        throw new Error(response.message || 'Failed to create medication');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create medication';
      return rejectWithValue({ groupId: request.group_id, error: message });
    }
  },
);

export const updateMedication = createAsyncThunk(
  'medicine/updateMedication',
  async (
    { medicationId, groupId, request }: { medicationId: string; groupId: string; request: UpdateMedicationRequest },
    { rejectWithValue },
  ) => {
    try {
      const response = await medicineService.updateMedication(medicationId, request);
      if (response.status === 1 && response.data) {
        return { groupId, medication: response.data };
      } else {
        throw new Error(response.message || 'Failed to update medication');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update medication';
      return rejectWithValue({ groupId, error: message });
    }
  },
);

export const deleteMedication = createAsyncThunk(
  'medicine/deleteMedication',
  async ({ medicationId, groupId }: { medicationId: string; groupId: string }, { rejectWithValue }) => {
    try {
      const response = await medicineService.deleteMedication(medicationId);
      if (response.status === 1) {
        return { groupId, medicationId };
      } else {
        throw new Error(response.message || 'Failed to delete medication');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete medication';
      return rejectWithValue({ groupId, error: message });
    }
  },
);

export const fetchCourses = createAsyncThunk(
  'medicine/fetchCourses',
  async ({ petId, status }: { petId: string; status?: string }, { rejectWithValue }) => {
    try {
      const response = await medicineService.listCourses(petId, status);
      if (response.status === 1 && response.data) {
        return { petId, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to fetch courses');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch courses';
      return rejectWithValue({ petId, error: message });
    }
  },
);

export const createCourse = createAsyncThunk(
  'medicine/createCourse',
  async (request: CreateCourseRequest, { rejectWithValue }) => {
    try {
      const response = await medicineService.createCourse(request);
      if (response.status === 1 && response.data) {
        return { petId: request.pet_id, course: response.data };
      } else {
        throw new Error(response.message || 'Failed to create course');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create course';
      return rejectWithValue({ petId: request.pet_id, error: message });
    }
  },
);

export const endCourse = createAsyncThunk(
  'medicine/endCourse',
  async ({ courseId, petId, localDate }: { courseId: string; petId: string; localDate?: string }, { rejectWithValue }) => {
    try {
      const response = await medicineService.endCourse(courseId, localDate);
      if (response.status === 1 && response.data) {
        return { petId, course: response.data };
      } else {
        throw new Error(response.message || 'Failed to end course');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to end course';
      return rejectWithValue({ petId, error: message });
    }
  },
);

export const fetchTodaySchedule = createAsyncThunk(
  'medicine/fetchTodaySchedule',
  async ({ petId, localDate }: { petId: string; localDate?: string }, { rejectWithValue }) => {
    try {
      const response = await medicineService.getTodaySchedule(petId, localDate);
      if (response.status === 1 && response.data) {
        return { petId, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to fetch today schedule');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch today schedule';
      return rejectWithValue({ petId, error: message });
    }
  },
);

export const createLog = createAsyncThunk(
  'medicine/createLog',
  async (request: CreateLogRequest, { rejectWithValue }) => {
    try {
      const response = await medicineService.createLog(request);
      if (response.status === 1 && response.data) {
        return { petId: request.pet_id, log: response.data };
      } else {
        throw new Error(response.message || 'Failed to create log');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create log';
      return rejectWithValue({ petId: request.pet_id, error: message });
    }
  },
);

export const deleteLog = createAsyncThunk(
  'medicine/deleteLog',
  async ({ logId, petId }: { logId: string; petId: string }, { rejectWithValue }) => {
    try {
      const response = await medicineService.deleteLog(logId);
      if (response.status === 1) {
        return { petId, logId };
      } else {
        throw new Error(response.message || 'Failed to delete log');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete log';
      return rejectWithValue({ petId, error: message });
    }
  },
);

const medicineSlice = createSlice({
  name: 'medicine',
  initialState,
  reducers: {
    clearMedicineState: (state) => {
      state.medications = {};
      state.courses = {};
      state.todaySchedule = {};
      state.isLoading = {};
      state.error = {};
    },
    clearMedicineError: (state, action) => {
      const key = action.payload;
      state.error[key] = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch medications
      .addCase(fetchMedications.pending, (state, action) => {
        const { groupId } = action.meta.arg;
        state.isLoading[`meds_${groupId}`] = true;
        state.error[`meds_${groupId}`] = null;
      })
      .addCase(fetchMedications.fulfilled, (state, action) => {
        const { groupId, data } = action.payload;
        state.isLoading[`meds_${groupId}`] = false;
        state.medications[groupId] = data;
      })
      .addCase(fetchMedications.rejected, (state, action) => {
        const payload = action.payload as { groupId: string; error: string };
        state.isLoading[`meds_${payload.groupId}`] = false;
        state.error[`meds_${payload.groupId}`] = payload.error;
      })
      // Create medication
      .addCase(createMedication.pending, (state, action) => {
        const { group_id } = action.meta.arg;
        state.isLoading[`meds_${group_id}`] = true;
      })
      .addCase(createMedication.fulfilled, (state, action) => {
        const { groupId } = action.payload;
        state.isLoading[`meds_${groupId}`] = false;
      })
      .addCase(createMedication.rejected, (state, action) => {
        const payload = action.payload as { groupId: string; error: string };
        state.isLoading[`meds_${payload.groupId}`] = false;
        state.error[`meds_${payload.groupId}`] = payload.error;
      })
      // Update medication
      .addCase(updateMedication.fulfilled, (state, action) => {
        const { groupId } = action.payload;
        state.isLoading[`meds_${groupId}`] = false;
      })
      .addCase(updateMedication.rejected, (state, action) => {
        const payload = action.payload as { groupId: string; error: string };
        state.isLoading[`meds_${payload.groupId}`] = false;
        state.error[`meds_${payload.groupId}`] = payload.error;
      })
      // Delete medication
      .addCase(deleteMedication.fulfilled, (state, action) => {
        const { groupId, medicationId } = action.payload;
        state.isLoading[`meds_${groupId}`] = false;
        if (state.medications[groupId]) {
          state.medications[groupId] = state.medications[groupId].filter((m) => m.id !== medicationId);
        }
      })
      .addCase(deleteMedication.rejected, (state, action) => {
        const payload = action.payload as { groupId: string; error: string };
        state.isLoading[`meds_${payload.groupId}`] = false;
        state.error[`meds_${payload.groupId}`] = payload.error;
      })
      // Fetch courses
      .addCase(fetchCourses.pending, (state, action) => {
        const { petId } = action.meta.arg;
        state.isLoading[`courses_${petId}`] = true;
        state.error[`courses_${petId}`] = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        const { petId, data } = action.payload;
        state.isLoading[`courses_${petId}`] = false;
        state.courses[petId] = data;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        const payload = action.payload as { petId: string; error: string };
        state.isLoading[`courses_${payload.petId}`] = false;
        state.error[`courses_${payload.petId}`] = payload.error;
      })
      // Create course
      .addCase(createCourse.fulfilled, (state, action) => {
        const { petId } = action.payload;
        state.isLoading[`courses_${petId}`] = false;
      })
      .addCase(createCourse.rejected, (state, action) => {
        const payload = action.payload as { petId: string; error: string };
        state.isLoading[`courses_${payload.petId}`] = false;
        state.error[`courses_${payload.petId}`] = payload.error;
      })
      // End course
      .addCase(endCourse.fulfilled, (state, action) => {
        const { petId } = action.payload;
        state.isLoading[`courses_${petId}`] = false;
      })
      .addCase(endCourse.rejected, (state, action) => {
        const payload = action.payload as { petId: string; error: string };
        state.isLoading[`courses_${payload.petId}`] = false;
        state.error[`courses_${payload.petId}`] = payload.error;
      })
      // Fetch today schedule
      .addCase(fetchTodaySchedule.pending, (state, action) => {
        const { petId } = action.meta.arg;
        state.isLoading[`today_${petId}`] = true;
        state.error[`today_${petId}`] = null;
      })
      .addCase(fetchTodaySchedule.fulfilled, (state, action) => {
        const { petId, data } = action.payload;
        state.isLoading[`today_${petId}`] = false;
        state.todaySchedule[petId] = data;
      })
      .addCase(fetchTodaySchedule.rejected, (state, action) => {
        const payload = action.payload as { petId: string; error: string };
        state.isLoading[`today_${payload.petId}`] = false;
        state.error[`today_${payload.petId}`] = payload.error;
      })
      // Create log
      .addCase(createLog.fulfilled, (state, action) => {
        const { petId } = action.payload;
        state.isLoading[`today_${petId}`] = false;
      })
      .addCase(createLog.rejected, (state, action) => {
        const payload = action.payload as { petId: string; error: string };
        state.isLoading[`today_${payload.petId}`] = false;
        state.error[`today_${payload.petId}`] = payload.error;
      })
      // Delete log
      .addCase(deleteLog.fulfilled, (state, action) => {
        const { petId } = action.payload;
        state.isLoading[`today_${petId}`] = false;
      })
      .addCase(deleteLog.rejected, (state, action) => {
        const payload = action.payload as { petId: string; error: string };
        state.isLoading[`today_${payload.petId}`] = false;
        state.error[`today_${payload.petId}`] = payload.error;
      })
      // Handle logout
      .addCase(logout, (state) => {
        state.medications = {};
        state.courses = {};
        state.todaySchedule = {};
        state.isLoading = {};
        state.error = {};
      });
  },
});

export const { clearMedicineState, clearMedicineError } = medicineSlice.actions;
export default medicineSlice.reducer;
