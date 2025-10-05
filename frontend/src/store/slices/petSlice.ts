import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Pet, CreatePetRequest, PetInfo, UserRole } from '../../types';
import { petService } from '../../api';

// PetAccess interface for pet selection page
export interface PetAccess {
    petId: string;
    userId: string;
    role: UserRole;
    pet: Pet;
}

interface PetState {
    selectedPet: Pet | null;
    userPets: PetAccess[] | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: PetState = {
    selectedPet: null,
    userPets: null,
    isLoading: false,
    error: null,
}

export const createPet = createAsyncThunk(
    'pet/createPet',
    async (request: CreatePetRequest, { rejectWithValue }) => {
        try {
            const response = await petService.createPet(request);
            if (response.status === 1 && response.data) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to create pet');
            }
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create pet');
        }
    }
)

export const fetchAccessiblePets = createAsyncThunk(
    'pet/fetchAccessiblePets',
    async (_, { rejectWithValue }) => {
        try {
            const response = await petService.getAccessiblePets();
            if (response.status === 1 && response.data) {
                // Convert PetInfo[] to PetAccess[]
                const petAccessList: PetAccess[] = response.data.map((petInfo: PetInfo) => ({
                    petId: petInfo.id,
                    userId: petInfo.owner_id,
                    role: (petInfo.user_permission as UserRole) || 'Viewer',
                    pet: {
                        id: petInfo.id,
                        name: petInfo.name,
                        pet_type: petInfo.pet_type,
                        breed: petInfo.breed,
                        gender: petInfo.gender,
                        current_weight_kg: petInfo.current_weight_kg,
                        owner_id: petInfo.owner_id,
                        group_id: petInfo.group_id,
                        created_at: petInfo.created_at,
                        updated_at: petInfo.updated_at,
                        is_active: petInfo.is_active,
                    }
                }));
                return petAccessList;
            } else {
                throw new Error(response.message || 'Failed to fetch accessible pets');
            }
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch accessible pets');
        }
    }
)

const petSlice = createSlice({
    name: 'pet',
    initialState,
    reducers: {
        selectPet: (state, action: PayloadAction<Pet>) => {
            console.log('🐕 Redux Pet: Selecting pet:', action.payload.name);
            state.selectedPet = action.payload;
        },
        clearSelectedPet: (state) => {
            console.log('🚫 Redux Pet: Clearing selected pet');
            state.selectedPet = null;
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Handle createPet
            .addCase(createPet.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createPet.fulfilled, (state) => {
                state.isLoading = false;
                // Optionally add the created pet to userPets if needed
            })
            .addCase(createPet.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Handle fetchAccessiblePets
            .addCase(fetchAccessiblePets.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAccessiblePets.fulfilled, (state, action) => {
                state.isLoading = false;
                state.userPets = action.payload;
                console.log('✅ Redux Pet: Pets loaded:', action.payload.length);
            })
            .addCase(fetchAccessiblePets.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    }
});

export const { selectPet, clearSelectedPet, clearError } = petSlice.actions;
export default petSlice.reducer;
