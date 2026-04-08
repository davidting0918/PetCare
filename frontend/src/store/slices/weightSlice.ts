import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WeightRecord, CreateWeightRequest, UpdateWeightRequest, SearchWeightRecordsRequest } from '../../types';
import { weightService } from '../../api';
import { logout } from './authSlice';

interface WeightState {
    records: Record<string, WeightRecord[]>; // petId -> WeightRecord[]
    isLoading: Record<string, boolean>; // petId -> loading state
    error: Record<string, string | null>; // petId -> error message
}

const initialState: WeightState = {
    records: {},
    isLoading: {},
    error: {},
};

export const fetchWeightRecords = createAsyncThunk(
    'weight/fetchWeightRecords',
    async (
        { petId, params }: { petId: string; params?: Omit<SearchWeightRecordsRequest, 'pet_id'> },
        { rejectWithValue }
    ) => {
        try {
            const response = await weightService.getWeightRecords(petId, params);
            if (response.status === 1 && response.data) {
                return { petId, data: response.data };
            } else {
                throw new Error(response.message || 'Failed to fetch weight records');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch weight records';
            return rejectWithValue({ petId, error: message });
        }
    }
);

export const createWeight = createAsyncThunk(
    'weight/createWeight',
    async (request: CreateWeightRequest, { rejectWithValue }) => {
        try {
            const response = await weightService.createWeight(request);
            if (response.status === 1 && response.data) {
                return { petId: request.pet_id, record: response.data };
            } else {
                throw new Error(response.message || 'Failed to create weight record');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create weight record';
            return rejectWithValue({ petId: request.pet_id, error: message });
        }
    }
);

export const updateWeight = createAsyncThunk(
    'weight/updateWeight',
    async (
        { weightId, petId, request }: { weightId: string; petId: string; request: UpdateWeightRequest },
        { rejectWithValue }
    ) => {
        try {
            const response = await weightService.updateWeight(weightId, request);
            if (response.status === 1 && response.data) {
                return { petId, record: response.data };
            } else {
                throw new Error(response.message || 'Failed to update weight record');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update weight record';
            return rejectWithValue({ petId, error: message });
        }
    }
);

const weightSlice = createSlice({
    name: 'weight',
    initialState,
    reducers: {
        clearWeightState: (state) => {
            state.records = {};
            state.isLoading = {};
            state.error = {};
        },
        clearWeightError: (state, action: PayloadAction<string>) => {
            const petId = action.payload;
            state.error[petId] = null;
        },
        clearWeightRecords: (state, action: PayloadAction<string>) => {
            const petId = action.payload;
            delete state.records[petId];
            delete state.isLoading[petId];
            delete state.error[petId];
        },
    },
    extraReducers: (builder) => {
        builder
            // Handle fetchWeightRecords
            .addCase(fetchWeightRecords.pending, (state, action) => {
                const petId = action.meta.arg.petId;
                state.isLoading[petId] = true;
                state.error[petId] = null;
            })
            .addCase(fetchWeightRecords.fulfilled, (state, action) => {
                const { petId, data } = action.payload;
                state.isLoading[petId] = false;
                state.records[petId] = data.records;
                state.error[petId] = null;
            })
            .addCase(fetchWeightRecords.rejected, (state, action) => {
                const petId = action.meta.arg.petId;
                const payload = action.payload as { petId: string; error: string } | undefined;
                state.isLoading[petId] = false;
                state.error[petId] = payload?.error || action.error.message || 'Failed to fetch weight records';
            })
            // Handle createWeight
            .addCase(createWeight.pending, (state, action) => {
                const petId = action.meta.arg.pet_id;
                state.isLoading[petId] = true;
                state.error[petId] = null;
            })
            .addCase(createWeight.fulfilled, (state, action) => {
                const { petId, record } = action.payload;
                state.isLoading[petId] = false;
                // Add new record to the beginning of the array
                if (!state.records[petId]) {
                    state.records[petId] = [];
                }
                state.records[petId] = [record, ...state.records[petId]];
                state.error[petId] = null;
            })
            .addCase(createWeight.rejected, (state, action) => {
                const petId = action.meta.arg.pet_id;
                const payload = action.payload as { petId: string; error: string } | undefined;
                state.isLoading[petId] = false;
                state.error[petId] = payload?.error || action.error.message || 'Failed to create weight record';
            })
            // Handle updateWeight
            .addCase(updateWeight.pending, (state, action) => {
                const petId = action.meta.arg.petId;
                state.isLoading[petId] = true;
                state.error[petId] = null;
            })
            .addCase(updateWeight.fulfilled, (state, action) => {
                const { petId, record } = action.payload;
                state.isLoading[petId] = false;
                // Update the record in the array
                if (state.records[petId]) {
                    const index = state.records[petId].findIndex(r => r.id === record.id);
                    if (index !== -1) {
                        state.records[petId][index] = record;
                    }
                }
                state.error[petId] = null;
            })
            .addCase(updateWeight.rejected, (state, action) => {
                const petId = action.meta.arg.petId;
                const payload = action.payload as { petId: string; error: string } | undefined;
                state.isLoading[petId] = false;
                state.error[petId] = payload?.error || action.error.message || 'Failed to update weight record';
            })
            // Handle logout from auth slice - clear weight state
            .addCase(logout, (state) => {
                state.records = {};
                state.isLoading = {};
                state.error = {};
            });
    }
});

export const { clearWeightState, clearWeightError, clearWeightRecords } = weightSlice.actions;
export default weightSlice.reducer;
