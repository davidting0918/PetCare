import React, { useState } from 'react';
import { PawPrint, X } from 'lucide-react';
import { usePet } from '../../hooks';
import type { CreatePetRequest } from '../../types';

interface CreatePetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  title?: string;
}

export const CreatePetForm: React.FC<CreatePetFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Add New Pet"
}) => {
  const { create, isLoading } = usePet();
  const [formData, setFormData] = useState<CreatePetRequest>({
    name: '',
    pet_type: 'Dog',
    gender: 'Male',
    breed: '',
    birth_date: undefined,
    current_weight_kg: undefined,
    target_weight_kg: undefined,
    height_cm: undefined,
    is_spayed: false,
    microchip_id: '',
    daily_calorie_target: undefined,
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof CreatePetRequest, value: any) => {
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
      newErrors.name = 'Pet name is required';
    }
    if (!formData.pet_type) {
      newErrors.pet_type = 'Pet type is required';
    }
    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await create(formData);
      onSuccess?.('Pet created successfully!');
      handleClose();
    } catch (error) {
      console.error('❌ CreatePetForm: Error creating pet:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create pet' });
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      pet_type: 'Dog',
      gender: 'Male',
      breed: '',
      birth_date: undefined,
      current_weight_kg: undefined,
      target_weight_kg: undefined,
      height_cm: undefined,
      is_spayed: false,
      microchip_id: '',
      daily_calorie_target: undefined,
      notes: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-3d max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange/20 rounded-full flex items-center justify-center mr-3">
              <PawPrint className="w-5 h-5 text-orange" />
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

          {/* Pet Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pet Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange/50 focus:border-orange ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter pet name"
              disabled={isLoading}
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Pet Type and Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pet Type *
              </label>
              <select
                value={formData.pet_type}
                onChange={(e) => handleInputChange('pet_type', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange/50 focus:border-orange ${
                  errors.pet_type ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading}
              >
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Bird">Bird</option>
                <option value="Fish">Fish</option>
                <option value="Rabbit">Rabbit</option>
                <option value="Other">Other</option>
              </select>
              {errors.pet_type && <p className="text-red-600 text-xs mt-1">{errors.pet_type}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender *
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange/50 focus:border-orange ${
                  errors.gender ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {errors.gender && <p className="text-red-600 text-xs mt-1">{errors.gender}</p>}
            </div>
          </div>

          {/* Breed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Breed
            </label>
            <input
              type="text"
              value={formData.breed || ''}
              onChange={(e) => handleInputChange('breed', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange/50 focus:border-orange"
              placeholder="e.g., Golden Retriever, Persian Cat"
              disabled={isLoading}
            />
          </div>

          {/* Birth Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Birth Date
            </label>
            <input
              type="date"
              value={formData.birth_date || ''}
              onChange={(e) => handleInputChange('birth_date', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange/50 focus:border-orange"
              disabled={isLoading}
            />
          </div>

          {/* Weight Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.current_weight_kg || ''}
                onChange={(e) => handleInputChange('current_weight_kg', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange/50 focus:border-orange"
                placeholder="0.0"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.target_weight_kg || ''}
                onChange={(e) => handleInputChange('target_weight_kg', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange/50 focus:border-orange"
                placeholder="0.0"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                value={formData.height_cm || ''}
                onChange={(e) => handleInputChange('height_cm', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange/50 focus:border-orange"
                placeholder="0"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Calorie Target
              </label>
              <input
                type="number"
                value={formData.daily_calorie_target || ''}
                onChange={(e) => handleInputChange('daily_calorie_target', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange/50 focus:border-orange"
                placeholder="0"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Microchip ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Microchip ID
            </label>
            <input
              type="text"
              value={formData.microchip_id || ''}
              onChange={(e) => handleInputChange('microchip_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange/50 focus:border-orange"
              placeholder="Enter microchip number"
              disabled={isLoading}
            />
          </div>

          {/* Spayed/Neutered */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_spayed"
              checked={formData.is_spayed || false}
              onChange={(e) => handleInputChange('is_spayed', e.target.checked)}
              className="rounded border-gray-300 text-orange focus:ring-orange"
              disabled={isLoading}
            />
            <label htmlFor="is_spayed" className="ml-2 text-sm text-gray-700">
              Spayed/Neutered
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange/50 focus:border-orange resize-none"
              placeholder="Any additional information about your pet..."
              disabled={isLoading}
            />
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
              className="flex-1 btn-3d btn-3d-orange text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Pet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
