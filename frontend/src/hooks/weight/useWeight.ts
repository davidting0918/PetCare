import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../redux";
import { fetchWeightRecords, createWeight, updateWeight } from "../../store";
import type { CreateWeightRequest, UpdateWeightRequest, SearchWeightRecordsRequest, WeightRecord } from "../../types";

export const useWeight = () => {
    const dispatch = useAppDispatch();
    const weightState = useAppSelector((state) => state.weight);

    // Get weight records for a specific pet
    const getWeightRecords = useCallback(async (
        petId: string,
        params?: Omit<SearchWeightRecordsRequest, 'pet_id'>
    ) => {
        const result = await dispatch(fetchWeightRecords({ petId, params }));
        if (fetchWeightRecords.rejected.match(result)) {
            const payload = result.payload as { petId: string; error: string };
            throw new Error(payload.error);
        }
    }, [dispatch]);

    // Create a new weight record
    const create = useCallback(async (request: CreateWeightRequest) => {
        const result = await dispatch(createWeight(request));
        if (createWeight.rejected.match(result)) {
            const payload = result.payload as { petId: string; error: string };
            throw new Error(payload.error);
        }
    }, [dispatch]);

    // Update an existing weight record
    const update = useCallback(async (weightId: string, petId: string, request: UpdateWeightRequest) => {
        const result = await dispatch(updateWeight({ weightId, petId, request }));
        if (updateWeight.rejected.match(result)) {
            const payload = result.payload as { petId: string; error: string };
            throw new Error(payload.error);
        }
    }, [dispatch]);

    // Get weight records for a pet (from cache)
    const getCachedWeightRecords = useCallback((petId: string): WeightRecord[] => {
        return weightState.records[petId] || [];
    }, [weightState.records]);

    // Get loading state for a pet
    const isLoadingWeightRecords = useCallback((petId: string): boolean => {
        return weightState.isLoading[petId] || false;
    }, [weightState.isLoading]);

    // Get error for a pet
    const getWeightError = useCallback((petId: string): string | null => {
        return weightState.error[petId] || null;
    }, [weightState.error]);

    // Refresh weight records for a pet
    const refreshWeightRecords = useCallback(async (
        petId: string,
        params?: Omit<SearchWeightRecordsRequest, 'pet_id'>
    ) => {
        return getWeightRecords(petId, params);
    }, [getWeightRecords]);

    return {
        // Get cached records
        getCachedWeightRecords,
        // Get loading state
        isLoadingWeightRecords,
        // Get error
        getWeightError,
        // Operations
        getWeightRecords,
        create,
        update,
        refreshWeightRecords,
    };
};
