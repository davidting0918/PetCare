import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../redux';
import { loginUser, signupUser, logout, selectPet } from '../../store/slices/authSlice';
import { selectAuth } from './selectors';
import type { Pet } from '../../types';

/**
 * 主要的認證 Hook
 * 提供所有認證相關的狀態和操作
 *
 * @returns 認證狀態和操作函數
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector(selectAuth);

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
