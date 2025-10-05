import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux";
import { createPet, fetchAccessiblePets } from "../../store";



export const usePet = () => {
    const dispatch = useAppDispatch();
    const petState = useAppSelector((state) => state.pet);
}

export const usePetInitialization = () => {
    const dispatch = useAppDispatch();
    useEffect(() => {
        dispatch(fetchAccessiblePets());
    }, [dispatch]);
}
