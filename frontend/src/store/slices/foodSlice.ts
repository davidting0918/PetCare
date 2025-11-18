import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
    FoodInfo,
    FoodDetails,
    CreateFoodRequest,
    UpdateFoodRequest,
    FoodType,
    TargetPet
} from '../../types';
import { foodService } from '../../api';
import { logout } from './authSlice';

interface FoodState {
    foods: Record<string, FoodInfo[]>; // groupId -> FoodInfo[]
    selectedFood: FoodDetails | null;
    isLoading: Record<string, boolean>; // groupId -> loading state
    error: Record<string, string | null>; // groupId -> error message
}

const initialState: FoodState = {
    foods: {},
    selectedFood: null,
    isLoading: {},
    error: {},
};

export const fetchGroupFoods = createAsyncThunk(
    'food/fetchGroupFoods',
    async (
        { groupId, foodType, targetPet }: { groupId: string; foodType?: FoodType; targetPet?: TargetPet },
        { rejectWithValue }
    ) => {
        try {
            const response = await foodService.getGroupFoods(groupId, foodType, targetPet);
            if (response.status === 1 && response.data) {
                return { groupId, data: response.data };
            } else {
                throw new Error(response.message || 'Failed to fetch group foods');
            }
        } catch (error: any) {
            return rejectWithValue({ groupId, error: error.message || 'Failed to fetch group foods' });
        }
    }
);

export const createFood = createAsyncThunk(
    'food/createFood',
    async (
        { groupId, request }: { groupId: string; request: CreateFoodRequest },
        { rejectWithValue }
    ) => {
        try {
            const response = await foodService.createFood(groupId, request);
            if (response.status === 1 && response.data) {
                return { groupId, food: response.data };
            } else {
                throw new Error(response.message || 'Failed to create food');
            }
        } catch (error: any) {
            return rejectWithValue({ groupId, error: error.message || 'Failed to create food' });
        }
    }
);

export const updateFood = createAsyncThunk(
    'food/updateFood',
    async (
        { foodId, groupId, request }: { foodId: string; groupId: string; request: UpdateFoodRequest },
        { rejectWithValue }
    ) => {
        try {
            const response = await foodService.updateFood(foodId, request);
            if (response.status === 1 && response.data) {
                return { groupId, food: response.data };
            } else {
                throw new Error(response.message || 'Failed to update food');
            }
        } catch (error: any) {
            return rejectWithValue({ groupId, error: error.message || 'Failed to update food' });
        }
    }
);

export const deleteFood = createAsyncThunk(
    'food/deleteFood',
    async (
        { foodId, groupId }: { foodId: string; groupId: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await foodService.deleteFood(foodId);
            if (response.status === 1) {
                return { groupId, foodId };
            } else {
                throw new Error(response.message || 'Failed to delete food');
            }
        } catch (error: any) {
            return rejectWithValue({ groupId, error: error.message || 'Failed to delete food' });
        }
    }
);

const foodSlice = createSlice({
    name: 'food',
    initialState,
    reducers: {
        clearFoodState: (state) => {
            state.foods = {};
            state.selectedFood = null;
            state.isLoading = {};
            state.error = {};
        },
        selectFood: (state, action: PayloadAction<FoodDetails | null>) => {
            state.selectedFood = action.payload;
        },
        clearError: (state, action) => {
            const groupId = action.payload;
            state.error[groupId] = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch group foods
            .addCase(fetchGroupFoods.pending, (state, action) => {
                const { groupId } = action.meta.arg;
                state.isLoading[groupId] = true;
                state.error[groupId] = null;
            })
            .addCase(fetchGroupFoods.fulfilled, (state, action) => {
                const { groupId, data } = action.payload;
                state.isLoading[groupId] = false;
                state.foods[groupId] = data;
            })
            .addCase(fetchGroupFoods.rejected, (state, action) => {
                const payload = action.payload as { groupId: string; error: string };
                state.isLoading[payload.groupId] = false;
                state.error[payload.groupId] = payload.error;
            })
            // Create food
            .addCase(createFood.pending, (state, action) => {
                const { groupId } = action.meta.arg;
                state.isLoading[groupId] = true;
                state.error[groupId] = null;
            })
            .addCase(createFood.fulfilled, (state, action) => {
                const { groupId } = action.payload;
                state.isLoading[groupId] = false;
                // Food will be refetched after creation
            })
            .addCase(createFood.rejected, (state, action) => {
                const payload = action.payload as { groupId: string; error: string };
                state.isLoading[payload.groupId] = false;
                state.error[payload.groupId] = payload.error;
            })
            // Update food
            .addCase(updateFood.pending, (state, action) => {
                const { groupId } = action.meta.arg;
                state.isLoading[groupId] = true;
                state.error[groupId] = null;
            })
            .addCase(updateFood.fulfilled, (state, action) => {
                const { groupId } = action.payload;
                state.isLoading[groupId] = false;
                // Food will be refetched after update
            })
            .addCase(updateFood.rejected, (state, action) => {
                const payload = action.payload as { groupId: string; error: string };
                state.isLoading[payload.groupId] = false;
                state.error[payload.groupId] = payload.error;
            })
            // Delete food
            .addCase(deleteFood.pending, (state, action) => {
                const { groupId } = action.meta.arg;
                state.isLoading[groupId] = true;
                state.error[groupId] = null;
            })
            .addCase(deleteFood.fulfilled, (state, action) => {
                const { groupId, foodId } = action.payload;
                state.isLoading[groupId] = false;
                // Remove the food from state
                if (state.foods[groupId]) {
                    state.foods[groupId] = state.foods[groupId].filter(f => f.id !== foodId);
                }
            })
            .addCase(deleteFood.rejected, (state, action) => {
                const payload = action.payload as { groupId: string; error: string };
                state.isLoading[payload.groupId] = false;
                state.error[payload.groupId] = payload.error;
            })
            // Handle logout
            .addCase(logout, (state) => {
                state.foods = {};
                state.selectedFood = null;
                state.isLoading = {};
                state.error = {};
            });
    }
});

export const { clearFoodState, selectFood, clearError } = foodSlice.actions;
export default foodSlice.reducer;
