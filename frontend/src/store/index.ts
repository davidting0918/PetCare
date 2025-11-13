import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import petReducer from './slices/petSlice';
import groupReducer from './slices/groupSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    pet: petReducer,
    group: groupReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [],
      },
    }),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export * from './slices/authSlice';
export {
  createPet,
  fetchAccessiblePets,
  deletePet,
  selectPet,
  clearPetState,
  clearError as clearPetError
} from './slices/petSlice';
export {
  createGroup,
  fetchMyGroupsWithMembers,
  clearGroupState,
  clearError as clearGroupError
} from './slices/groupSlice';
export type { PetAccess } from './slices/petSlice';
