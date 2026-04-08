import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type {
    MealInfo,
    TodayMealSummary,
    CreateMealRequest,
    UpdateMealRequest,
    MealQueryFilters
} from '../../types';
import { mealService } from '../../api';
import { logout } from './authSlice';

interface MealState {
    meals: Record<string, MealInfo[]>; // petId -> MealInfo[]
    todaySummary: Record<string, TodayMealSummary>; // petId -> TodayMealSummary
    isLoading: Record<string, boolean>; // petId -> loading state
    error: Record<string, string | null>; // petId -> error message
}

const initialState: MealState = {
    meals: {},
    todaySummary: {},
    isLoading: {},
    error: {},
};

export const fetchMealRecords = createAsyncThunk(
    'meal/fetchMealRecords',
    async (
        { petId, filters }: { petId: string; filters?: Omit<MealQueryFilters, 'pet_id'> },
        { rejectWithValue }
    ) => {
        try {
            const queryFilters: MealQueryFilters = {
                pet_id: petId,
                limit: 50,
                ...filters
            };
            const response = await mealService.getMealRecords(queryFilters);
            if (response.status === 1 && response.data) {
                return { petId, data: response.data };
            } else {
                throw new Error(response.message || 'Failed to fetch meal records');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch meal records';
            return rejectWithValue({ petId, error: message });
        }
    }
);

export const createMeal = createAsyncThunk(
    'meal/createMeal',
    async (request: CreateMealRequest, { rejectWithValue }) => {
        try {
            const response = await mealService.createMeal(request);
            if (response.status === 1 && response.data) {
                return { petId: request.pet_id, meal: response.data };
            } else {
                throw new Error(response.message || 'Failed to create meal');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create meal';
            return rejectWithValue({ petId: request.pet_id, error: message });
        }
    }
);

export const updateMeal = createAsyncThunk(
    'meal/updateMeal',
    async (
        { mealId, petId, request }: { mealId: string; petId: string; request: UpdateMealRequest },
        { rejectWithValue }
    ) => {
        try {
            const response = await mealService.updateMeal(mealId, request);
            if (response.status === 1 && response.data) {
                return { petId, meal: response.data };
            } else {
                throw new Error(response.message || 'Failed to update meal');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update meal';
            return rejectWithValue({ petId, error: message });
        }
    }
);

export const deleteMeal = createAsyncThunk(
    'meal/deleteMeal',
    async (
        { mealId, petId }: { mealId: string; petId: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await mealService.deleteMeal(mealId);
            if (response.status === 1) {
                return { petId, mealId };
            } else {
                throw new Error(response.message || 'Failed to delete meal');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete meal';
            return rejectWithValue({ petId, error: message });
        }
    }
);

export const fetchTodayMeals = createAsyncThunk(
    'meal/fetchTodayMeals',
    async (
        { petId, filters }: { petId: string; filters?: Omit<MealQueryFilters, 'pet_id' | 'date_from' | 'date_to'> },
        { rejectWithValue }
    ) => {
        try {
            const queryFilters = {
                pet_id: petId,
                ...filters
            };
            const response = await mealService.getTodayMeals(queryFilters);
            if (response.status === 1 && response.data) {
                return { petId, data: response.data };
            } else {
                throw new Error(response.message || 'Failed to fetch today meals');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch today meals';
            return rejectWithValue({ petId, error: message });
        }
    }
);

const mealSlice = createSlice({
    name: 'meal',
    initialState,
    reducers: {
        clearMealState: (state) => {
            state.meals = {};
            state.todaySummary = {};
            state.isLoading = {};
            state.error = {};
        },
        clearError: (state, action) => {
            const petId = action.payload;
            state.error[petId] = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch meal records
            .addCase(fetchMealRecords.pending, (state, action) => {
                const { petId } = action.meta.arg;
                state.isLoading[petId] = true;
                state.error[petId] = null;
            })
            .addCase(fetchMealRecords.fulfilled, (state, action) => {
                const { petId, data } = action.payload;
                state.isLoading[petId] = false;
                state.meals[petId] = data;
            })
            .addCase(fetchMealRecords.rejected, (state, action) => {
                const payload = action.payload as { petId: string; error: string };
                state.isLoading[payload.petId] = false;
                state.error[payload.petId] = payload.error;
            })
            // Create meal
            .addCase(createMeal.pending, (state, action) => {
                const { pet_id } = action.meta.arg;
                state.isLoading[pet_id] = true;
                state.error[pet_id] = null;
            })
            .addCase(createMeal.fulfilled, (state, action) => {
                const { petId } = action.payload;
                state.isLoading[petId] = false;
                // Meal will be refetched after creation
            })
            .addCase(createMeal.rejected, (state, action) => {
                const payload = action.payload as { petId: string; error: string };
                state.isLoading[payload.petId] = false;
                state.error[payload.petId] = payload.error;
            })
            // Update meal
            .addCase(updateMeal.pending, (state, action) => {
                const { petId } = action.meta.arg;
                state.isLoading[petId] = true;
                state.error[petId] = null;
            })
            .addCase(updateMeal.fulfilled, (state, action) => {
                const { petId } = action.payload;
                state.isLoading[petId] = false;
                // Meal will be refetched after update
            })
            .addCase(updateMeal.rejected, (state, action) => {
                const payload = action.payload as { petId: string; error: string };
                state.isLoading[payload.petId] = false;
                state.error[payload.petId] = payload.error;
            })
            // Delete meal
            .addCase(deleteMeal.pending, (state, action) => {
                const { petId } = action.meta.arg;
                state.isLoading[petId] = true;
                state.error[petId] = null;
            })
            .addCase(deleteMeal.fulfilled, (state, action) => {
                const { petId, mealId } = action.payload;
                state.isLoading[petId] = false;
                // Remove the meal from state
                if (state.meals[petId]) {
                    state.meals[petId] = state.meals[petId].filter(m => m.id !== mealId);
                }
            })
            .addCase(deleteMeal.rejected, (state, action) => {
                const payload = action.payload as { petId: string; error: string };
                state.isLoading[payload.petId] = false;
                state.error[payload.petId] = payload.error;
            })
            // Fetch today meals
            .addCase(fetchTodayMeals.pending, (state, action) => {
                const { petId } = action.meta.arg;
                state.isLoading[petId] = true;
                state.error[petId] = null;
            })
            .addCase(fetchTodayMeals.fulfilled, (state, action) => {
                const { petId, data } = action.payload;
                state.isLoading[petId] = false;
                state.todaySummary[petId] = data;
            })
            .addCase(fetchTodayMeals.rejected, (state, action) => {
                const payload = action.payload as { petId: string; error: string };
                state.isLoading[payload.petId] = false;
                state.error[payload.petId] = payload.error;
            })
            // Handle logout
            .addCase(logout, (state) => {
                state.meals = {};
                state.todaySummary = {};
                state.isLoading = {};
                state.error = {};
            });
    }
});

export const { clearMealState, clearError } = mealSlice.actions;
export default mealSlice.reducer;
