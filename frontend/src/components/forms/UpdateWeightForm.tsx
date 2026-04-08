import React, { useState, useEffect } from 'react';
import { Scale, X } from 'lucide-react';
import { useWeight } from '../../hooks';
import { formatForDateTimeLocal, datetimeLocalToUtc } from '../../utils/dateUtils';
import type { UpdateWeightRequest, WeightRecord } from '../../types';

interface UpdateWeightFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  weightRecord: WeightRecord | null;
  title?: string;
}

export const UpdateWeightForm: React.FC<UpdateWeightFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  weightRecord,
  title = "Update Weight Record"
}) => {
  const { update } = useWeight();
  const [formData, setFormData] = useState<UpdateWeightRequest>({
    weight: 0,
    timestamp: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form data when weightRecord changes
  useEffect(() => {
    if (weightRecord) {
      setFormData({
        weight: weightRecord.weight,
        timestamp: formatForDateTimeLocal(weightRecord.timestamp), // Format: YYYY-MM-DDTHH:mm (local time)
        notes: weightRecord.notes || ''
      });
    }
  }, [weightRecord]);

  const handleInputChange = <K extends keyof UpdateWeightRequest>(field: K, value: UpdateWeightRequest[K]) => {
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

    if (formData.weight !== undefined) {
      if (!formData.weight || formData.weight <= 0) {
        newErrors.weight = 'Weight must be greater than 0';
      } else if (formData.weight < 0.1) {
        newErrors.weight = 'Weight must be at least 0.1 kg';
      } else if (formData.weight > 200) {
        newErrors.weight = 'Weight must be less than 200 kg';
      }
    }

    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = 'Notes must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !weightRecord) return;

    setIsLoading(true);
    try {
      const submitData: UpdateWeightRequest = {
        ...(formData.weight !== undefined && {
          weight: Math.round(parseFloat(formData.weight.toString()) * 100) / 100
        }),
        ...(formData.timestamp && { timestamp: datetimeLocalToUtc(formData.timestamp) }),
        ...(formData.notes?.trim() && { notes: formData.notes.trim() })
      };

      console.log('⚖️ UpdateWeightForm: Submitting data:', submitData);

      await update(weightRecord.id, weightRecord.pet_id, submitData);

      console.log('✅ UpdateWeightForm: Weight updated successfully');
      onSuccess?.('Weight record updated successfully!');
      handleClose();
    } catch (error) {
      console.error('❌ UpdateWeightForm: Error updating weight:', error);

      // Extract error message from different error formats
      let errorMessage = 'Failed to update weight record';

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
    if (weightRecord) {
      setFormData({
        weight: weightRecord.weight,
        timestamp: formatForDateTimeLocal(weightRecord.timestamp),
        notes: weightRecord.notes || ''
      });
    }
    setErrors({});
    onClose();
  };

  if (!isOpen || !weightRecord) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-3d max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-mint/20 rounded-full flex items-center justify-center mr-3">
              <Scale className="w-5 h-5 text-mint" />
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

          {/* Weight Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight (kg) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              max="200"
              value={formData.weight || ''}
              onChange={(e) => handleInputChange('weight', e.target.value ? parseFloat(e.target.value) : 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint/50 focus:border-mint ${
                errors.weight ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0.00"
              disabled={isLoading}
            />
            {errors.weight && <p className="text-red-600 text-xs mt-1">{errors.weight}</p>}
          </div>

          {/* Timestamp Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="datetime-local"
              value={formData.timestamp || ''}
              onChange={(e) => handleInputChange('timestamp', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint/50 focus:border-mint"
              disabled={isLoading}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              maxLength={500}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint/50 focus:border-mint resize-none ${
                errors.notes ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter notes"
              disabled={isLoading}
            />
            {errors.notes && <p className="text-red-600 text-xs mt-1">{errors.notes}</p>}
            <p className="text-gray-500 text-xs mt-1">
              {formData.notes?.length || 0}/500 characters
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
              className="flex-1 btn-3d btn-3d-mint text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update Weight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
