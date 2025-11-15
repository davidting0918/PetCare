import React, { useState, useEffect, useRef } from 'react';
import { User, X, Upload, Camera, Lock, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { useUser } from '../../hooks';
import type { User as UserType } from '../../types';

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

  // Form states
  const [name, setName] = useState(user.name);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setSelectedFile(null);
      setPreviewUrl(null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      setErrors({});
    }
  }, [isOpen, user]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ ...errors, photo: 'Please upload a JPEG, PNG, GIF, or WebP image' });
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors({ ...errors, photo: 'File is too large. Maximum size is 10MB' });
      return;
    }

    // Clear previous errors
    const newErrors = { ...errors };
    delete newErrors.photo;
    setErrors(newErrors);

    // Set file and create preview
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordSection(false);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const getCurrentPhotoUrl = () => {
    if (previewUrl) return previewUrl;
    if (user.picture) {
      // Handle Google photos and local photos
      if (user.picture.startsWith('http')) {
        return user.picture;
      }
      // Local backend photos
      return `${import.meta.env.VITE_API_BASE_URL}${user.picture}`;
    }
    return null;
  };

  const currentPhotoUrl = getCurrentPhotoUrl();

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
                {currentPhotoUrl ? (
                  <img
                    src={currentPhotoUrl}
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
                    onClick={handleRemovePhoto}
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

          {/* Password Section (Collapsible) */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
              disabled={isLoading}
            >
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700">Change Password</span>
              </div>
              {showPasswordSection ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {showPasswordSection && (
              <div className="p-4 space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => {
                        setOldPassword(e.target.value);
                        if (errors.oldPassword) {
                          const newErrors = { ...errors };
                          delete newErrors.oldPassword;
                          setErrors(newErrors);
                        }
                      }}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-mint/50 focus:border-mint ${
                        errors.oldPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter current password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.oldPassword && <p className="text-red-600 text-xs mt-1">{errors.oldPassword}</p>}
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errors.newPassword) {
                          const newErrors = { ...errors };
                          delete newErrors.newPassword;
                          setErrors(newErrors);
                        }
                      }}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-mint/50 focus:border-mint ${
                        errors.newPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter new password (min 6 characters)"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-red-600 text-xs mt-1">{errors.newPassword}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) {
                          const newErrors = { ...errors };
                          delete newErrors.confirmPassword;
                          setErrors(newErrors);
                        }
                      }}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-mint/50 focus:border-mint ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Confirm new password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            )}
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
