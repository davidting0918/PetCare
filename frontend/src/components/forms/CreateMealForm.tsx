import React, { useState, useEffect, useMemo } from 'react';
import { UtensilsCrossed, X } from 'lucide-react';
import { usePet, useMeal, useFood } from '../../hooks';
import type { CreateMealRequest, MealType, ServingType } from '../../types';

interface CreateMealFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  title?: string;
  preSelectedFoodId?: string;
}

export const CreateMealForm: React.FC<CreateMealFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Log Meal",
  preSelectedFoodId
}) => {
  const { selectedPet } = usePet();
  const { create } = useMeal();
  const { getCachedGroupFoods, getGroupFoods } = useFood();

  const groupId = selectedPet?.group_id;
  const foods = groupId ? getCachedGroupFoods(groupId) : [];

  const [formData, setFormData] = useState<CreateMealRequest>({
    pet_id: selectedPet?.id || '',
    food_id: preSelectedFoodId || '',
    fed_at: new Date().toISOString().slice(0, 16),
    meal_type: undefined,
    serving_type: 'units',
    serving_amount: 1,
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load foods when modal opens
  useEffect(() => {
    if (isOpen && groupId && foods.length === 0) {
      getGroupFoods(groupId).catch(error => {
        console.error('Failed to load foods:', error);
      });
    }
  }, [isOpen, groupId, foods.length, getGroupFoods]);

  // Get selected food details
  const selectedFood = useMemo(() => {
    return foods.find(f => f.id === formData.food_id);
  }, [foods, formData.food_id]);

  // Calculate actual weight and calories
  const calculations = useMemo(() => {
    if (!selectedFood || !formData.serving_amount) {
      return { actualWeightG: 0, estimatedCalories: 0 };
    }

    const actualWeightG = formData.serving_type === 'units'
      ? formData.serving_amount * selectedFood.unit_weight
      : formData.serving_amount;

    const estimatedCalories = (actualWeightG / 100) * selectedFood.calories;

    return {
      actualWeightG: Math.round(actualWeightG * 100) / 100,
      estimatedCalories: Math.round(estimatedCalories * 100) / 100
    };
  }, [selectedFood, formData.serving_amount, formData.serving_type]);

  const handleInputChange = (field: keyof CreateMealRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

    if (!formData.food_id) {
      newErrors.food_id = 'Please select a food';
    }

    if (!formData.serving_amount || formData.serving_amount <= 0) {
      newErrors.serving_amount = 'Serving amount must be greater than 0';
    } else if (formData.serving_amount > 10000) {
      newErrors.serving_amount = 'Serving amount must be less than 10000';
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
      const submitData: CreateMealRequest = {
        pet_id: selectedPet!.id,
        food_id: formData.food_id,
        fed_at: formData.fed_at ? new Date(formData.fed_at).toISOString() : undefined,
        meal_type: formData.meal_type || undefined,
        serving_type: formData.serving_type,
        serving_amount: parseFloat(formData.serving_amount.toString()),
        notes: formData.notes?.trim() || undefined
      };

      console.log('🍽️ CreateMealForm: Submitting data:', submitData);
      await create(submitData);
      console.log('✅ CreateMealForm: Meal recorded successfully');

      onSuccess?.('Meal recorded successfully!');
      handleClose();
    } catch (error: any) {
      console.error('❌ CreateMealForm: Error recording meal:', error);

      let errorMessage = 'Failed to record meal';
      if (error.response?.data?.detail) {
        errorMessage = typeof error.response.data.detail === 'string'
          ? error.response.data.detail
          : 'Validation error';
      } else if (error.message) {
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
      food_id: preSelectedFoodId || '',
      fed_at: new Date().toISOString().slice(0, 16),
      meal_type: undefined,
      serving_type: 'units',
      serving_amount: 1,
      notes: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card-3d bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-mint/20 flex items-center justify-center mr-3">
              <UtensilsCrossed className="w-5 h-5 text-mint" />
            </div>
            <h3 className="text-lg font-semibold text-earth">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Pet Info (read-only) */}
          {selectedPet && (
            <div className="bg-mint/5 rounded-lg p-3 border border-mint/20">
              <p className="text-sm text-gray-600 mb-1">Feeding</p>
              <p className="font-semibold text-earth">{selectedPet.name}</p>
            </div>
          )}

          {/* Date & Time */}
          <div>
            <label className="block text-sm font-medium text-earth mb-2">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.fed_at}
              onChange={(e) => handleInputChange('fed_at', e.target.value)}
              max={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-2 border-2 border-mint/30 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint hover:border-mint/50 transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Food Selection */}
          <div>
            <label className="block text-sm font-medium text-earth mb-2">
              Select Food *
            </label>
            <select
              value={formData.food_id}
              onChange={(e) => handleInputChange('food_id', e.target.value)}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint hover:border-mint/50 transition-colors ${
                errors.food_id ? 'border-red-300' : 'border-mint/30'
              }`}
              disabled={isLoading}
            >
              <option value="">Choose a food...</option>
              {foods.map((food) => (
                <option key={food.id} value={food.id}>
                  {food.brand} - {food.product_name} ({food.food_type})
                </option>
              ))}
            </select>
            {errors.food_id && (
              <p className="text-red-500 text-sm mt-1">{errors.food_id}</p>
            )}
          </div>

          {/* Meal Type */}
          <div>
            <label className="block text-sm font-medium text-earth mb-2">
              Meal Type (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleInputChange('meal_type', type === formData.meal_type ? undefined : type)}
                  className={`py-2 px-4 rounded-lg border-2 transition-colors ${
                    formData.meal_type === type
                      ? 'bg-mint/20 border-mint text-mint font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-mint/50'
                  }`}
                  disabled={isLoading}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Serving Size */}
          <div>
            <label className="block text-sm font-medium text-earth mb-2">
              Serving Size *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="10000"
                value={formData.serving_amount}
                onChange={(e) => handleInputChange('serving_amount', parseFloat(e.target.value) || 0)}
                className={`flex-1 px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint hover:border-mint/50 transition-colors ${
                  errors.serving_amount ? 'border-red-300' : 'border-mint/30'
                }`}
                disabled={isLoading}
              />
              <select
                value={formData.serving_type}
                onChange={(e) => handleInputChange('serving_type', e.target.value as ServingType)}
                className="px-4 py-2 border-2 border-mint/30 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint hover:border-mint/50 transition-colors"
                disabled={isLoading}
              >
                <option value="units">Units</option>
                <option value="grams">Grams</option>
              </select>
            </div>
            {errors.serving_amount && (
              <p className="text-red-500 text-sm mt-1">{errors.serving_amount}</p>
            )}

            {/* Calculations Display */}
            {selectedFood && formData.serving_amount > 0 && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  ≈ {calculations.actualWeightG}g • ~{calculations.estimatedCalories} kcal
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-earth mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              maxLength={500}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint hover:border-mint/50 transition-colors resize-none ${
                errors.notes ? 'border-red-300' : 'border-mint/30'
              }`}
              disabled={isLoading}
            />
            {errors.notes && (
              <p className="text-red-500 text-sm mt-1">{errors.notes}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.notes?.length || 0}/500
            </p>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-3d btn-3d-mint px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Recording...' : 'Record Meal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
