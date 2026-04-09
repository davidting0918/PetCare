import React, { useState } from 'react';
import { Scale, X } from 'lucide-react';
import { usePet, useWeight } from '../../hooks';
import { getCurrentLocalDateTime, datetimeLocalToUtc } from '../../utils/dateUtils';
import type { CreateWeightRequest } from '../../types';

interface CreateWeightFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  title?: string;
}

export const CreateWeightForm: React.FC<CreateWeightFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Record Weight"
}) => {
  const { selectedPet } = usePet();
  const { create } = useWeight();
  const [formData, setFormData] = useState<CreateWeightRequest>({
    pet_id: selectedPet?.id || '',
    weight: 0,
    timestamp: getCurrentLocalDateTime(), // Format: YYYY-MM-DDTHH:mm (local time)
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = <K extends keyof CreateWeightRequest>(field: K, value: CreateWeightRequest[K]) => {
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

    if (!selectedPet) {
      newErrors.pet_id = 'No pet selected';
    }

    if (!formData.weight || formData.weight <= 0) {
      newErrors.weight = 'Weight must be greater than 0';
    } else if (formData.weight < 0.1) {
      newErrors.weight = 'Weight must be at least 0.1 kg';
    } else if (formData.weight > 200) {
      newErrors.weight = 'Weight must be less than 200 kg';
    }

    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = 'Notes must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const submitData: CreateWeightRequest = {
        pet_id: selectedPet!.id,
        weight: Math.round(parseFloat(formData.weight.toString()) * 100) / 100, // Round to 2 decimal places
        timestamp: formData.timestamp ? datetimeLocalToUtc(formData.timestamp) : undefined,
        notes: formData.notes?.trim() || undefined
      };

      console.log('⚖️ CreateWeightForm: Submitting data:', submitData);

      await create(submitData);

      console.log('✅ CreateWeightForm: Weight recorded successfully');
      onSuccess?.('Weight recorded successfully!');
      handleClose();
    } catch (error) {
      console.error('❌ CreateWeightForm: Error recording weight:', error);

      // Extract error message from different error formats
      let errorMessage = 'Failed to record weight';

      if (error && typeof error === 'object' && 'response' in error) {
        const data = (error as { response?: { data?: { detail?: unknown; message?: string } } }).response?.data;
        if (data?.detail) {
          if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (Array.isArray(data.detail)) {
            errorMessage = data.detail
              .map((err: { msg?: string }) => err.msg ?? '')
              .filter(Boolean)
              .join(', ');
          }
        } else if (typeof data?.message === 'string') {
          errorMessage = data.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      pet_id: selectedPet?.id || '',
      weight: 0,
      timestamp: getCurrentLocalDateTime(),
      notes: ''
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
              <Scale className="w-5 h-5 text-accent-teal" />
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


          {/* Weight Input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Weight (kg) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              max="200"
              value={formData.weight || ''}
              onChange={(e) => handleInputChange('weight', e.target.value ? parseFloat(e.target.value) : 0)}
              className={`input-field ${errors.weight ? 'border-danger' : ''}`}
              placeholder="0.00"
              disabled={isLoading}
            />
            {errors.weight && <p className="text-danger text-xs mt-1">{errors.weight}</p>}
          </div>

          {/* Timestamp Input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Date
            </label>
            <input
              type="datetime-local"
              value={formData.timestamp || ''}
              onChange={(e) => handleInputChange('timestamp', e.target.value)}
              className="input-field"
              disabled={isLoading}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              maxLength={500}
              className={`input-field resize-none ${errors.notes ? 'border-danger' : ''}`}
              placeholder="Enter notes"
              disabled={isLoading}
            />
            {errors.notes && <p className="text-danger text-xs mt-1">{errors.notes}</p>}
            <p className="text-text-tertiary text-xs mt-1">
              {formData.notes?.length || 0}/500 characters
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
              {isLoading ? 'Recording...' : 'Record Weight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
