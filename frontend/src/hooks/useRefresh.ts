import { useState, useCallback } from 'react';
import { useAppDispatch } from './redux';
import { refreshCurrentUser, fetchAccessiblePets, fetchMyGroupsWithMembers } from '../store';

/**
 * Hook for refreshing all application data
 * Refreshes user info, pet info, and group info in parallel
 */
export const useRefresh = () => {
  const dispatch = useAppDispatch();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Refresh all data in parallel
      await Promise.all([
        dispatch(refreshCurrentUser()),
        dispatch(fetchAccessiblePets()),
        dispatch(fetchMyGroupsWithMembers())
      ]);
    } catch (error) {
      // Silent failure - only log to console
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch]);

  return {
    refreshAll,
    isRefreshing
  };
};
