/**
 * Hooks 總匯出檔案
 * 只匯出目前實作的認證相關功能
 */

// ===== Redux 基礎 Hooks =====
export { useAppDispatch, useAppSelector } from './redux';

// ===== 認證相關 Hooks =====
export {
  // 主要 Auth Hook
  useAuth,

  // 狀態 Hooks
  useAuthInitialization,
  useAuthState,
  useIsAuthenticated,
  useCurrentUser,
  useSelectedPet,
  useUserPets,
  useCanManageSelectedPet,
  useSelectedPetWithAccess,

  // Selectors (供其他模組使用)
  selectAuth,
  selectUser,
  selectSelectedPet,
  selectUserPets,
  selectIsAuthenticated,
  selectIsLoading,
  selectAuthError,
  selectCurrentUserPets,
  selectCanManageSelectedPet,
  selectSelectedPetWithAccess
} from './auth';
