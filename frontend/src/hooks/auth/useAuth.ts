import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../redux';
import { loginUser, signupUser, logout, initializeAuth } from '../../store';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

  // 🔐 登入
  const login = useCallback(async (email: string, pwd: string): Promise<void> => {
    console.log('🔐 useAuth: Starting login...');
    const result = await dispatch(loginUser({ email, pwd }));

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

  return {
    // 狀態
    ...authState,

    // 操作
    login,
    signup,
    logout: handleLogout,
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
