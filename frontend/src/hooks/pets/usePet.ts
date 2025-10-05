import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux";
import { createPet, fetchAccessiblePets, selectPet as selectPetAction } from "../../store";
import type { CreatePetRequest, Pet } from "../../types";

export const usePet = () => {
    const dispatch = useAppDispatch();
    const petState = useAppSelector((state) => state.pet);

    // 創建寵物
    const create = useCallback(async (request: CreatePetRequest) => {
        const result = await dispatch(createPet(request));
        if (createPet.rejected.match(result)) {
            throw new Error(result.payload as string);
        }
    }, [dispatch]);

    // 獲取可訪問的寵物
    const getAvailablePets = useCallback(async () => {
        console.log('🔄 usePet: Manually calling fetchAccessiblePets');
        const result = await dispatch(fetchAccessiblePets());
        if (fetchAccessiblePets.rejected.match(result)) {
            throw new Error(result.payload as string);
        }
    }, [dispatch]);

    // 選擇寵物
    const selectPet = useCallback((pet: Pet) => {
        console.log('🐕 usePet: Selecting pet:', pet.name);
        dispatch(selectPetAction(pet));
    }, [dispatch]);

    return {
        // 狀態
        selectedPet: petState.selectedPet,
        userPets: petState.userPets || [], // 直接返回狀態，確保穩定的引用
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

    useEffect(() => {
        if (!userPets && !isLoading) {
            dispatch(fetchAccessiblePets());
        }
    }, [dispatch, userPets, isLoading]);
}
