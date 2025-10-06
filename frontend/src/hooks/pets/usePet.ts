import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux";
import { createPet, fetchAccessiblePets, selectPet as selectPetAction } from "../../store";
import type { CreatePetRequest, Pet } from "../../types";

export const usePet = () => {
    const dispatch = useAppDispatch();
    const petState = useAppSelector((state) => state.pet);
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    // 創建寵物
    const create = useCallback(async (request: CreatePetRequest) => {
        const result = await dispatch(createPet(request));
        if (createPet.rejected.match(result)) {
            throw new Error(result.payload as string);
        }
    }, [dispatch]);

    // 獲取可訪問的寵物
    const getAvailablePets = useCallback(async () => {
        if (!isAuthenticated) return;

        const result = await dispatch(fetchAccessiblePets());
        if (fetchAccessiblePets.rejected.match(result)) {
            throw new Error(result.payload as string);
        }
    }, [dispatch, isAuthenticated]);

    // 選擇寵物
    const selectPet = useCallback((pet: Pet) => {
        dispatch(selectPetAction(pet));
    }, [dispatch]);

    return {
        // 狀態
        selectedPet: petState.selectedPet,
        userPets: petState.userPets || [],
        isLoading: petState.isLoading,
        error: petState.error,

        // 操作函數
        create,
        getAvailablePets,
        selectPet,
    }
}

export const usePetInitialization = () => {
    const dispatch = useAppDispatch();
    const { userPets, isLoading } = useAppSelector((state) => state.pet);
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    useEffect(() => {
        // 只有在用戶已認證且沒有寵物數據時才獲取
        if (isAuthenticated && !userPets && !isLoading) {
            dispatch(fetchAccessiblePets());
        }
    }, [dispatch, userPets, isLoading, isAuthenticated]);
}
