import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../redux";
import {
    fetchMealRecords,
    createMeal,
    updateMeal,
    deleteMeal as deleteMealAction,
    fetchTodayMeals
} from "../../store";
import type {
    CreateMealRequest,
    UpdateMealRequest,
    MealQueryFilters,
    MealInfo,
    TodayMealSummary
} from "../../types";

export const useMeal = () => {
    const dispatch = useAppDispatch();
    const mealState = useAppSelector((state) => state.meal);

    // Get meal records for a specific pet
    const getMealRecords = useCallback(async (
        petId: string,
        filters?: Omit<MealQueryFilters, 'pet_id'>
    ) => {
        const result = await dispatch(fetchMealRecords({ petId, filters }));
        if (fetchMealRecords.rejected.match(result)) {
            const payload = result.payload as { petId: string; error: string };
            throw new Error(payload.error);
        }
    }, [dispatch]);

    // Create a new meal record
    const create = useCallback(async (request: CreateMealRequest) => {
        const result = await dispatch(createMeal(request));
        if (createMeal.rejected.match(result)) {
            const payload = result.payload as { petId: string; error: string };
            throw new Error(payload.error);
        }
    }, [dispatch]);

    // Update an existing meal record
    const update = useCallback(async (mealId: string, petId: string, request: UpdateMealRequest) => {
        const result = await dispatch(updateMeal({ mealId, petId, request }));
        if (updateMeal.rejected.match(result)) {
            const payload = result.payload as { petId: string; error: string };
            throw new Error(payload.error);
        }
    }, [dispatch]);

    // Delete a meal record
    const deleteMeal = useCallback(async (mealId: string, petId: string) => {
        const result = await dispatch(deleteMealAction({ mealId, petId }));
        if (deleteMealAction.rejected.match(result)) {
            const payload = result.payload as { petId: string; error: string };
            throw new Error(payload.error);
        }
    }, [dispatch]);

    // Get today's meals for a pet
    const getTodayMeals = useCallback(async (
        petId: string,
        filters?: Omit<MealQueryFilters, 'pet_id' | 'date_from' | 'date_to'>
    ) => {
        const result = await dispatch(fetchTodayMeals({ petId, filters }));
        if (fetchTodayMeals.rejected.match(result)) {
            const payload = result.payload as { petId: string; error: string };
            throw new Error(payload.error);
        }
    }, [dispatch]);

    // Get meal records for a pet (from cache)
    const getCachedMealRecords = useCallback((petId: string): MealInfo[] => {
        return mealState.meals[petId] || [];
    }, [mealState.meals]);

    // Check if there is cached meal records for a pet
    const hasCachedMealRecords = useCallback((petId: string): boolean => {
        return !!mealState.meals[petId] && mealState.meals[petId].length > 0;
    }, [mealState.meals]);

    // Get today's summary for a pet (from cache)
    const getCachedTodaySummary = useCallback((petId: string): TodayMealSummary | null => {
        return mealState.todaySummary[petId] || null;
    }, [mealState.todaySummary]);

    // Check if there is cached today summary for a pet
    const hasCachedTodaySummary = useCallback((petId: string): boolean => {
        return !!mealState.todaySummary[petId];
    }, [mealState.todaySummary]);

    // Get loading state for a pet
    const isLoadingMealRecords = useCallback((petId: string): boolean => {
        return mealState.isLoading[petId] || false;
    }, [mealState.isLoading]);

    // Check if we should fetch meal records for a pet
    // Returns true if there's no cached data and not currently loading
    const shouldFetchMealRecords = useCallback((petId: string): boolean => {
        const hasCache = hasCachedMealRecords(petId);
        const isLoading = isLoadingMealRecords(petId);
        return !hasCache && !isLoading;
    }, [hasCachedMealRecords, isLoadingMealRecords]);

    // Check if we should fetch today summary for a pet
    // Returns true if there's no cached data and not currently loading
    const shouldFetchTodaySummary = useCallback((petId: string): boolean => {
        const hasCache = hasCachedTodaySummary(petId);
        const isLoading = isLoadingMealRecords(petId);
        return !hasCache && !isLoading;
    }, [hasCachedTodaySummary, isLoadingMealRecords]);

    // Get error for a pet
    const getMealError = useCallback((petId: string): string | null => {
        return mealState.error[petId] || null;
    }, [mealState.error]);

    // Refresh meal records for a pet
    const refreshMealRecords = useCallback(async (
        petId: string,
        filters?: Omit<MealQueryFilters, 'pet_id'>
    ) => {
        return getMealRecords(petId, filters);
    }, [getMealRecords]);

    return {
        // Get cached records
        getCachedMealRecords,
        hasCachedMealRecords,
        getCachedTodaySummary,
        hasCachedTodaySummary,
        // Check if should fetch
        shouldFetchMealRecords,
        shouldFetchTodaySummary,
        // Get loading state
        isLoadingMealRecords,
        // Get error
        getMealError,
        // Operations
        getMealRecords,
        getTodayMeals,
        create,
        update,
        deleteMeal,
        refreshMealRecords,
    };
};
