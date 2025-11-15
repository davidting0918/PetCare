import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import type { CreateGroupRequest, JoinGroupRequest } from '../../types';
import {
    createGroup,
    deleteGroup,
    joinGroup,
    fetchMyGroupsWithMembers,
    fetchGroupPets,
    refreshGroupPets,
    clearGroupState,
    clearError,
    clearGroupPetsCache,
    clearAllGroupPetsCache
} from '../../store/slices/groupSlice';

export const useGroup = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { groups, groupPets, isLoading, isLoadingPets, error, petsError } = useSelector((state: RootState) => state.group);

    const create = useCallback(async (request: CreateGroupRequest) => {
        return dispatch(createGroup(request)).unwrap();
    }, [dispatch]);

    const fetchGroups = useCallback(async () => {
        return dispatch(fetchMyGroupsWithMembers()).unwrap();
    }, [dispatch]);

    const clearGroups = useCallback(() => {
        dispatch(clearGroupState());
    }, [dispatch]);

    const clearGroupError = useCallback(() => {
        dispatch(clearError());
    }, [dispatch]);

    const removeGroup = useCallback(async (groupId: string) => {
        return dispatch(deleteGroup(groupId)).unwrap();
    }, [dispatch]);

    const join = useCallback(async (request: JoinGroupRequest) => {
        return dispatch(joinGroup(request)).unwrap();
    }, [dispatch]);

    // Get pets for a group (already loaded during initial fetch)
    const getGroupPets = useCallback((groupId: string) => {
        // Pets are already loaded with fetchMyGroupsWithMembers
        // If somehow not available, fetch it (fallback)
        if (!groupPets[groupId] && !isLoadingPets[groupId]) {
            console.log(`⚠️ Pets not found for group ${groupId}, fetching...`);
            dispatch(fetchGroupPets(groupId));
        }
        return groupPets[groupId] || [];
    }, [dispatch, groupPets, isLoadingPets]);

    // Force refresh pets for a group
    const refreshPets = useCallback(async (groupId: string) => {
        return dispatch(refreshGroupPets(groupId)).unwrap();
    }, [dispatch]);

    // Clear pets cache for a specific group
    const clearPetsCache = useCallback((groupId: string) => {
        dispatch(clearGroupPetsCache(groupId));
    }, [dispatch]);

    // Clear all pets cache
    const clearAllPetsCache = useCallback(() => {
        dispatch(clearAllGroupPetsCache());
    }, [dispatch]);

    // Get loading state for a specific group's pets
    const isLoadingGroupPets = useCallback((groupId: string) => {
        return isLoadingPets[groupId] || false;
    }, [isLoadingPets]);

    // Get error for a specific group's pets
    const getGroupPetsError = useCallback((groupId: string) => {
        return petsError[groupId] || null;
    }, [petsError]);

    return {
        groups: groups || [],
        isLoading,
        error,
        create,
        fetchGroups,
        clearGroups,
        clearGroupError,
        removeGroup,
        join,
        // Group pets methods
        getGroupPets,
        refreshPets,
        clearPetsCache,
        clearAllPetsCache,
        isLoadingGroupPets,
        getGroupPetsError,
    };
};

/**
 * 初始化群組資料的 Hook
 * 在 App 組件中使用，自動載入使用者的群組資料
 */
export const useGroupInitialization = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { groups, isLoading } = useSelector((state: RootState) => state.group);
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        // 只有在用戶已認證且沒有群組數據時才獲取
        if (isAuthenticated && !groups && !isLoading) {
            dispatch(fetchMyGroupsWithMembers());
        }
    }, [dispatch, groups, isLoading, isAuthenticated]);
};
