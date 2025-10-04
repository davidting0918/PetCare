import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../redux';
import { loginUser, signupUser, logout, selectPet, initializeAuth } from '../../store/slices/authSlice';
import type { Pet } from '../../types';

/**
 * 主要的認證 Hook
 * 提供所有認證相關的狀態和操作
 *
 * @returns 認證狀態和操作函數
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

  // 🔐 登入
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    console.log('🔐 useAuth: Starting login...');
    const result = await dispatch(loginUser({ email, password }));

    if (loginUser.rejected.match(result)) {
      throw new Error(result.payload as string);
    }

    console.log('✅ useAuth: Login completed successfully');
  }, [dispatch]);

  // 📝 註冊
  const signup = useCallback(async (name: string, email: string, pwd: string): Promise<void> => {
    console.log('📝 useAuth: Starting signup...');
    const result = await dispatch(signupUser({ name, email, pwd }));

    if (signupUser.rejected.match(result)) {
      throw new Error(result.payload as string);
    }

    console.log('✅ useAuth: Signup completed successfully');
  }, [dispatch]);

  // 🚪 登出
  const handleLogout = useCallback((): void => {
    console.log('🚪 useAuth: Starting logout...');
    dispatch(logout());
  }, [dispatch]);

  // 🐕 選擇寵物
  const handleSelectPet = useCallback((pet: Pet): void => {
    console.log('🐕 useAuth: Selecting pet:', pet.name);
    dispatch(selectPet(pet));
  }, [dispatch]);

  // 📋 獲取用戶寵物列表
  const getUserPets = useCallback(() => {
    return authState.userPets?.map(access => ({ ...access })) || [];
  }, [authState.userPets]);

  return {
    // 狀態
    ...authState,

    // 操作
    login,
    signup,
    logout: handleLogout,
    selectPet: handleSelectPet,
    getUserPets,
  };
};

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
