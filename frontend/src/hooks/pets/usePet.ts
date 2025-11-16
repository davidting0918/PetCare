import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../redux";
import { createPet, fetchAccessiblePets, selectPet as selectPetAction, deletePet } from "../../store";
import type { CreatePetRequest, Pet, UpdatePetRequest } from "../../types";
import { petService } from "../../api";

export const usePet = () => {
    const dispatch = useAppDispatch();
    const petState = useAppSelector((state) => state.pet);
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(false);

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

    // 更新寵物資訊
    const updatePetInfo = useCallback(async (petId: string, request: UpdatePetRequest) => {
        setIsLoading(true);
        try {
            await petService.updatePet(petId, request);
            // Refresh pets after successful update
            await dispatch(fetchAccessiblePets());
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [dispatch]);

    // 上傳寵物照片
    const uploadPetPhoto = useCallback(async (petId: string, file: File) => {
        setIsLoading(true);
        try {
            await petService.uploadPetPhoto(petId, file);
            // Refresh pets after successful upload
            await dispatch(fetchAccessiblePets());
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [dispatch]);

    const selectPet = useCallback((pet: Pet) => {
        dispatch(selectPetAction(pet));
    }, [dispatch]);

    const removePet = useCallback(async (petId: string) => {
        const result = await dispatch(deletePet(petId));
        if (deletePet.rejected.match(result)) {
            throw new Error(result.payload as string);
        }
    }, [dispatch]);

    return {
        selectedPet: petState.selectedPet,
        userPets: petState.userPets || [],
        isLoading: petState.isLoading || isLoading,
        error: petState.error,

        // 操作函數
        create,
        getAvailablePets,
        updatePetInfo,
        uploadPetPhoto,
        selectPet,
        removePet,
    }
}

export const usePetInitialization = () => {
    const dispatch = useAppDispatch();
    const { userPets, selectedPet, isLoading } = useAppSelector((state) => state.pet);
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    useEffect(() => {
        // 只有在用戶已認證且沒有寵物數據時才獲取
        if (isAuthenticated && !userPets && !isLoading) {
            dispatch(fetchAccessiblePets());
        }

        // Auto-select first pet if available and none selected
        if (isAuthenticated && userPets && userPets.length > 0 && !selectedPet) {
            console.log('🐾 Auto-selecting first accessible pet:', userPets[0].pet.name);
            dispatch(selectPetAction(userPets[0].pet));
        }
    }, [dispatch, userPets, selectedPet, isLoading, isAuthenticated]);
}
