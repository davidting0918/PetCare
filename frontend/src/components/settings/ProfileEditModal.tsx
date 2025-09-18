import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Camera,
  Save,
  AlertCircle
} from 'lucide-react';
import type { User as UserType } from '../../types';

interface ProfileEditModalProps {
  user: UserType;
  onClose: () => void;
}

interface FormData {
  name: string;
  email: string;
  avatar?: string;
}

interface FormErrors {
  name?: string;
  email?: string;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  user,
  onClose
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: user.name,
    email: user.email,
    avatar: user.avatar
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field as keyof FormErrors]: undefined }));
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you'd upload this to a server
      const imageUrl = URL.createObjectURL(file);
      handleInputChange('avatar', imageUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Here you would typically update the user profile via API
      console.log('Updating user profile:', formData);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In a real app, you'd update the user context
      onClose();
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-primary w-full max-w-md max-h-[90vh] rounded-3xl overflow-hidden shadow-3d flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 shadow-3d flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Edit Profile</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Avatar Section */}
          <div className="card-3d p-4 text-center">
            <h3 className="font-medium text-gray-800 mb-3">Profile Picture</h3>
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-orange/20 flex items-center justify-center mx-auto mb-3 overflow-hidden">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-earth" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-2 right-1/2 transform translate-x-1/2 btn-3d p-2 text-white cursor-pointer"
              >
                <Camera className="w-4 h-4" />
              </label>
            </div>
            <p className="text-xs text-gray-500">
              Tap the camera icon to change your profile picture
            </p>
          </div>

          {/* Personal Information */}
          <div className="card-3d p-4 space-y-4">
            <h3 className="font-medium text-gray-800">Personal Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  className={`input-3d pl-10 w-full ${errors.name ? 'border-red-300 focus:border-red-500' : ''}`}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email address"
                  className={`input-3d pl-10 w-full ${errors.email ? 'border-red-300 focus:border-red-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="card-3d p-4">
            <h3 className="font-medium text-gray-800 mb-3">Account Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">User ID:</span>
                <span className="font-mono text-gray-800">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account Type:</span>
                <span className="text-gray-800">Standard</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Member Since:</span>
                <span className="text-gray-800">January 2024</span>
              </div>
              {user.googleId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Google Account:</span>
                  <span className="text-green-600 text-xs">✓ Connected</span>
                </div>
              )}
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="card-3d p-4">
            <h3 className="font-medium text-gray-800 mb-3">Privacy Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Profile Visibility</span>
                  <p className="text-xs text-gray-500">Allow family members to see your profile</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="toggle-checkbox"
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Activity Sharing</span>
                  <p className="text-xs text-gray-500">Share your pet care activities with family</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="toggle-checkbox"
                />
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-primary pt-4 pb-6 mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-3d w-full py-4 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving Changes...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
