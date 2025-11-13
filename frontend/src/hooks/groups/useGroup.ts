import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import type { CreateGroupRequest } from '../../types';
import { createGroup, fetchMyGroupsWithMembers, clearGroupState, clearError } from '../../store/slices/groupSlice';

export const useGroup = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { groups, isLoading, error } = useSelector((state: RootState) => state.group);

    const create = async (request: CreateGroupRequest) => {
        return dispatch(createGroup(request)).unwrap();
    };

    const fetchGroups = async () => {
        return dispatch(fetchMyGroupsWithMembers()).unwrap();
    };

    const clearGroups = () => {
        dispatch(clearGroupState());
    };

    const clearGroupError = () => {
        dispatch(clearError());
    };

    return {
        groups,
        isLoading,
        error,
        create,
        fetchGroups,
        clearGroups,
        clearGroupError,
    };
};
