import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../redux";
import {
    fetchGroupFoods,
    createFood as createFoodAction,
    updateFood as updateFoodAction,
    deleteFood as deleteFoodAction,
    selectFood
} from "../../store";
import type {
    CreateFoodRequest,
    UpdateFoodRequest,
    FoodInfo,
    FoodDetails,
    FoodType,
    TargetPet
} from "../../types";

export const useFood = () => {
    const dispatch = useAppDispatch();
    const foodState = useAppSelector((state) => state.food);

    // Get foods for a specific group
    const getGroupFoods = useCallback(async (
        groupId: string,
        foodType?: FoodType,
        targetPet?: TargetPet
    ) => {
        const result = await dispatch(fetchGroupFoods({ groupId, foodType, targetPet }));
        if (fetchGroupFoods.rejected.match(result)) {
            const payload = result.payload as { groupId: string; error: string };
            throw new Error(payload.error);
        }
    }, [dispatch]);

    // Create a new food
    const createFood = useCallback(async (groupId: string, request: CreateFoodRequest): Promise<FoodDetails> => {
        const result = await dispatch(createFoodAction({ groupId, request }));
        if (createFoodAction.rejected.match(result)) {
            const payload = result.payload as { groupId: string; error: string };
            throw new Error(payload.error);
        }
        if (createFoodAction.fulfilled.match(result)) {
            const payload = result.payload as { groupId: string; food: FoodDetails };
            return payload.food;
        }
        throw new Error('Failed to create food');
    }, [dispatch]);

    // Update an existing food
    const updateFood = useCallback(async (foodId: string, groupId: string, request: UpdateFoodRequest) => {
        const result = await dispatch(updateFoodAction({ foodId, groupId, request }));
        if (updateFoodAction.rejected.match(result)) {
            const payload = result.payload as { groupId: string; error: string };
            throw new Error(payload.error);
        }
    }, [dispatch]);

    // Delete a food
    const deleteFood = useCallback(async (foodId: string, groupId: string) => {
        const result = await dispatch(deleteFoodAction({ foodId, groupId }));
        if (deleteFoodAction.rejected.match(result)) {
            const payload = result.payload as { groupId: string; error: string };
            throw new Error(payload.error);
        }
    }, [dispatch]);

    // Get foods for a group (from cache)
    const getCachedGroupFoods = useCallback((groupId: string): FoodInfo[] => {
        return foodState.foods[groupId] || [];
    }, [foodState.foods]);

    // Check if there is cached data for a group
    const hasCachedGroupFoods = useCallback((groupId: string): boolean => {
        return !!foodState.foods[groupId] && foodState.foods[groupId].length > 0;
    }, [foodState.foods]);

    // Get loading state for a group
    const isLoadingGroupFoods = useCallback((groupId: string): boolean => {
        return foodState.isLoading[groupId] || false;
    }, [foodState.isLoading]);

    // Check if we should fetch foods for a group
    // Returns true if there's no cached data and not currently loading
    const shouldFetchGroupFoods = useCallback((groupId: string): boolean => {
        const hasCache = hasCachedGroupFoods(groupId);
        const isLoading = isLoadingGroupFoods(groupId);
        return !hasCache && !isLoading;
    }, [hasCachedGroupFoods, isLoadingGroupFoods]);

    // Get selected food details
    const getSelectedFood = useCallback((): FoodDetails | null => {
        return foodState.selectedFood;
    }, [foodState.selectedFood]);

    // Set selected food
    const setSelectedFood = useCallback((food: FoodDetails | null) => {
        dispatch(selectFood(food));
    }, [dispatch]);

    // Get loading state for a group
    const isLoadingGroupFoods = useCallback((groupId: string): boolean => {
        return foodState.isLoading[groupId] || false;
    }, [foodState.isLoading]);

    // Get error for a group
    const getFoodError = useCallback((groupId: string): string | null => {
        return foodState.error[groupId] || null;
    }, [foodState.error]);

    // Refresh foods for a group
    const refreshFoods = useCallback(async (
        groupId: string,
        foodType?: FoodType,
        targetPet?: TargetPet
    ) => {
        return getGroupFoods(groupId, foodType, targetPet);
    }, [getGroupFoods]);

    return {
        // Get cached foods
        getCachedGroupFoods,
        hasCachedGroupFoods,
        shouldFetchGroupFoods,
        getSelectedFood,
        // Get loading state
        isLoadingGroupFoods,
        // Get error
        getFoodError,
        // Operations
        getGroupFoods,
        createFood,
        updateFood,
        deleteFood,
        setSelectedFood,
        refreshFoods,
    };
};
