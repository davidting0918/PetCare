import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import petReducer from './slices/petSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    pet: petReducer,
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
export * from './slices/petSlice';
