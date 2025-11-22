import React, { useState, useEffect } from 'react';
import { User, X, Upload, Camera } from 'lucide-react';
import { useUser } from '../../hooks';
import { useFileUpload } from '../../hooks/useFileUpload';
import type { User as UserType } from '../../types';
import { getPhotoUrl } from '../../api';

interface EditUserInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  user: UserType;
}

export const EditUserInfoModal: React.FC<EditUserInfoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user
}) => {
  const { updateInfo, uploadPhoto, changePassword, isLoading } = useUser();

  // Use file upload hook
  const {
    selectedFile,
    error: fileError,
    fileInputRef,
    handleFileSelect,
    handleRemoveFile
  } = useFileUpload({
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  // Form states
  const [name, setName] = useState(user.name);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      handleRemoveFile();
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
    }
  }, [isOpen, user, handleRemoveFile]);

  // Sync file upload error with form errors
  useEffect(() => {
    if (fileError) {
      setErrors(prev => ({ ...prev, photo: fileError }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.photo;
        return newErrors;
      });
    }
  }, [fileError]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Validate password if any password field is filled
    if (oldPassword || newPassword || confirmPassword) {
      if (!oldPassword) {
        newErrors.oldPassword = 'Current password is required';
      }
      if (!newPassword) {
        newErrors.newPassword = 'New password is required';
      } else if (newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
      }
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (newPassword !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      let photoUploaded = false;
      let infoUpdated = false;
      let passwordChanged = false;

      // Upload photo if selected
      if (selectedFile) {
        await uploadPhoto(selectedFile);
        photoUploaded = true;
      }

      // Update name if changed
      if (name.trim() !== user.name) {
        await updateInfo({ name: name.trim() });
        infoUpdated = true;
      }

      // Change password if provided
      if (oldPassword && newPassword) {
        await changePassword(oldPassword, newPassword);
        passwordChanged = true;
      }

      // Build success message
      const updates = [];
      if (photoUploaded) updates.push('photo');
      if (infoUpdated) updates.push('profile');
      if (passwordChanged) updates.push('password');

      const message = updates.length > 0
        ? `Successfully updated ${updates.join(', ')}`
        : 'Profile updated';

      onSuccess?.(message);
      handleClose();
    } catch (error) {
      console.error('Failed to update user info:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to update profile' });
    }
  };

  const handleClose = () => {
    setName(user.name);
    handleRemoveFile();
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-3d max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <User className="w-6 h-6 text-earth" />
            <h2 className="text-xl font-bold text-earth">Edit Profile</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Profile Photo Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Profile Photo
            </label>
            <div className="flex items-center gap-4">
              {/* Avatar Preview */}
              <div className="w-24 h-24 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden shadow-3d relative">
                {user.picture ? (
                  <img
                    src={user.picture.startsWith('http') ? user.picture : getPhotoUrl(user.picture) || ''}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-orange/30 flex items-center justify-center text-earth font-semibold text-3xl">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {selectedFile && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-mint text-white rounded-lg hover:bg-mint/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">
                    {selectedFile ? 'Change Photo' : 'Upload Photo'}
                  </span>
                </button>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm disabled:opacity-50"
                  >
                    Remove Selected
                  </button>
                )}
                {selectedFile && (
                  <p className="text-xs text-gray-500 text-center">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
            {errors.photo && <p className="text-red-600 text-xs mt-2">{errors.photo}</p>}
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  const newErrors = { ...errors };
                  delete newErrors.name;
                  setErrors(newErrors);
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint/50 focus:border-mint ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter your name"
              disabled={isLoading}
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-mint text-white rounded-lg hover:bg-mint/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
