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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-2 rounded-2xl border border-border-default shadow-elevated max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-accent-teal/15 rounded-full flex items-center justify-center mr-3">
              <Users className="w-5 h-5 text-accent-teal" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">{title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
              <p className="text-danger text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Group Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`input-field ${errors.name ? 'border-danger' : ''}`}
              placeholder="Enter group name"
              disabled={isLoading}
              maxLength={50}
            />
            {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
            <p className="text-text-tertiary text-xs mt-1">
              {formData.name.length}/50 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary flex-1"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
