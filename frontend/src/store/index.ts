import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import petReducer from './slices/petSlice';
import groupReducer from './slices/groupSlice';
import weightReducer from './slices/weightSlice';
import mealReducer from './slices/mealSlice';
import foodReducer from './slices/foodSlice';
import medicineReducer from './slices/medicineSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    pet: petReducer,
    group: groupReducer,
    weight: weightReducer,
    meal: mealReducer,
    food: foodReducer,
    medicine: medicineReducer,
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
export {
  fetchWeightRecords,
  createWeight,
  updateWeight,
  clearWeightState,
  clearWeightError,
  clearWeightRecords
} from './slices/weightSlice';
export {
  fetchMealRecords,
  createMeal,
  updateMeal,
  deleteMeal,
  fetchTodayMeals,
  clearMealState,
  clearError as clearMealError
} from './slices/mealSlice';
export {
  fetchGroupFoods,
  createFood,
  updateFood,
  deleteFood,
  selectFood,
  clearFoodState,
  clearError as clearFoodError
} from './slices/foodSlice';
export {
  fetchMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  fetchCourses,
  createCourse,
  endCourse,
  fetchTodaySchedule,
  createLog,
  deleteLog,
  clearMedicineState,
  clearMedicineError
} from './slices/medicineSlice';
export type { PetAccess } from './slices/petSlice';
