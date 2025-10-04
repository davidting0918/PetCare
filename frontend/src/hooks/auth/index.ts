/**
 * Auth 模組統一匯出
 * 從這裡匯出所有認證相關的 hooks 和 selectors
 */

// Hooks
export { useAuth } from './useAuth';
export {
  useAuthInitialization,
  useAuthState,
  useIsAuthenticated,
  useCurrentUser,
  useSelectedPet,
  useUserPets,
  useCanManageSelectedPet,
  useSelectedPetWithAccess
} from './useAuthState';

// Selectors (供其他模組使用)
export {
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
} from './selectors';
