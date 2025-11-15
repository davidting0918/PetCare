import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { userService } from '../../api';
import { refreshCurrentUser } from '../../store/slices/authSlice';
import type { UpdateUserInfoRequest } from '../../types';

export const useUser = () => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  /**
   * Update user information (name and/or picture)
   */
  const updateInfo = async (request: UpdateUserInfoRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.updateUserInfo(request);

      if (response.status === 1) {
        // Refresh user data in Redux store
        await dispatch(refreshCurrentUser() as any);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update user info');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update user info';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Upload user profile photo
   */
  const uploadPhoto = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Validate file
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File is too large. Maximum size is 10MB.');
      }

      setUploadProgress(50); // Simulate progress

      const response = await userService.uploadUserPhoto(file);

      setUploadProgress(100);

      if (response.status === 1) {
        // Refresh user data to get updated picture URL
        await dispatch(refreshCurrentUser() as any);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to upload photo');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to upload photo';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Change user password
   */
  const changePassword = async (oldPassword: string, newPassword: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.resetPassword(oldPassword, newPassword);

      if (response.status === 1) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to change password');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to change password';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateInfo,
    uploadPhoto,
    changePassword,
    isLoading,
    error,
    uploadProgress,
  };
};
