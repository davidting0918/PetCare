import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { Pet, CreatePetRequest } from '../../types';
import { petService } from '../../api';

interface PetState {
    currentPet: Pet | null;
    userPets: Pet[] | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: PetState = {
    currentPet: null,
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
                return response.data;
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
    reducers: {},
})

export default petSlice.reducer;
