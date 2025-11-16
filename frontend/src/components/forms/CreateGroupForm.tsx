import React, { useState } from 'react';
import { Users, X } from 'lucide-react';
import { useGroup } from '../../hooks';
import type { CreateGroupRequest } from '../../types';

interface CreateGroupFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  title?: string;
}

export const CreateGroupForm: React.FC<CreateGroupFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Create New Group"
}) => {
  const { create, isLoading } = useGroup();
  const [formData, setFormData] = useState<CreateGroupRequest>({
    name: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof CreateGroupRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Group name must be 50 characters or less';
    } else if (formData.name.trim().length < 1) {
      newErrors.name = 'Group name must be at least 1 character';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const submitData: CreateGroupRequest = {
        name: formData.name.trim()
      };

      console.log('👥 CreateGroupForm: Submitting data:', submitData);
      await create(submitData);
      onSuccess?.('Group created successfully!');
      handleClose();
    } catch (error) {
      console.error('❌ CreateGroupForm: Error creating group:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create group' });
    }
  };

  const handleClose = () => {
    setFormData({
      name: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-3d max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-mint/20 rounded-full flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-mint" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint/50 focus:border-mint ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter group name"
              disabled={isLoading}
              maxLength={50}
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
            <p className="text-gray-500 text-xs mt-1">
              {formData.name.length}/50 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 btn-3d text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#B8D8D8',
              }}
            >
              {isLoading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
