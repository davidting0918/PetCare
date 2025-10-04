import type { RootState } from '../../store';

/**
 * Auth 相關的 Selectors
 * 用於從 Redux store 中選擇認證相關的狀態
 */

// ===== 基礎 Auth Selectors =====
export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectSelectedPet = (state: RootState) => state.auth.selectedPet;
export const selectUserPets = (state: RootState) => state.auth.userPets;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectIsLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;

// ===== 計算型 Selectors =====

/**
 * 獲取當前用戶的寵物列表（簡化版）
 */
export const selectCurrentUserPets = (state: RootState) => {
  const { userPets } = state.auth;
  return userPets?.map(access => access.pet) || [];
};

/**
 * 檢查用戶是否可以管理當前選中的寵物
 */
export const selectCanManageSelectedPet = (state: RootState) => {
  const { selectedPet, userPets } = state.auth;
  if (!selectedPet || !userPets) return false;

  const petAccess = userPets.find(access => access.petId === selectedPet.id);
  return petAccess?.role === 'Creator' || petAccess?.role === 'Member';
};

/**
 * 獲取選中寵物的詳細資訊（包含權限資訊）
 */
export const selectSelectedPetWithAccess = (state: RootState) => {
  const selectedPet = selectSelectedPet(state);
  const userPets = selectUserPets(state);

  if (!selectedPet || !userPets) return null;

  const petAccess = userPets.find(access => access.petId === selectedPet.id);

  return {
    pet: selectedPet,
    role: petAccess?.role,
    canManage: petAccess?.role === 'Creator' || petAccess?.role === 'Member',
    canView: !!petAccess
  };
};
