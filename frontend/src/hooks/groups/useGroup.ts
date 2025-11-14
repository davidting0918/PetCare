import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import type { CreateGroupRequest, JoinGroupRequest } from '../../types';
import { createGroup, deleteGroup, joinGroup, fetchMyGroupsWithMembers, clearGroupState, clearError } from '../../store/slices/groupSlice';

export const useGroup = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { groups, isLoading, error } = useSelector((state: RootState) => state.group);

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
