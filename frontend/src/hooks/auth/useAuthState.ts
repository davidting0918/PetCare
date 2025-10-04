import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../redux';
import { initializeAuth } from '../../store/slices/authSlice';
import {
  selectAuth,
  selectIsAuthenticated,
  selectUser,
  selectSelectedPet,
  selectCurrentUserPets,
  selectCanManageSelectedPet,
  selectSelectedPetWithAccess
} from './selectors';

/**
 * 初始化認證的 Hook
 * 在 App 組件中使用，自動檢查儲存的認證狀態
 */
export const useAuthInitialization = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log('🔄 useAuthInitialization: Initializing authentication...');
    dispatch(initializeAuth());
  }, [dispatch]);
};

/**
 * 只獲取認證狀態的 Hook
 * 適合只需要讀取狀態，不需要操作的組件
 */
export const useAuthState = () => {
  return useAppSelector(selectAuth);
};

/**
 * 檢查是否已認證的 Hook
 * 適合路由守衛或條件渲染
 */
export const useIsAuthenticated = () => {
  return useAppSelector(selectIsAuthenticated);
};

/**
 * 獲取當前用戶的 Hook
 * 適合顯示用戶資訊的組件
 */
export const useCurrentUser = () => {
  return useAppSelector(selectUser);
};

/**
 * 獲取選中寵物的 Hook
 * 適合需要寵物資訊的組件
 */
export const useSelectedPet = () => {
  return useAppSelector(selectSelectedPet);
};

/**
 * 獲取當前用戶寵物列表的 Hook
 * 適合寵物選擇器或列表組件
 */
export const useUserPets = () => {
  return useAppSelector(selectCurrentUserPets);
};

/**
 * 檢查是否可以管理選中寵物的 Hook
 * 適合權限檢查
 */
export const useCanManageSelectedPet = () => {
  return useAppSelector(selectCanManageSelectedPet);
};

/**
 * 獲取選中寵物及其權限資訊的 Hook
 * 適合需要完整寵物和權限資訊的組件
 */
export const useSelectedPetWithAccess = () => {
  return useAppSelector(selectSelectedPetWithAccess);
};
