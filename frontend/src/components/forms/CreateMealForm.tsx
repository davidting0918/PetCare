import React, { useState, useEffect, useMemo } from 'react';
import { UtensilsCrossed, X } from 'lucide-react';
import { usePet, useMeal, useFood } from '../../hooks';
import { getCurrentLocalDateTime, datetimeLocalToUtc } from '../../utils/dateUtils';
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
  const { getCachedGroupFoods, shouldFetchGroupFoods, getGroupFoods } = useFood();

  const groupId = selectedPet?.group_id;
  // Memoize so referential identity is stable across renders — required because
  // it feeds the dependency array of selectedFood / calculations useMemo below.
  const foods = useMemo(
    () => (groupId ? getCachedGroupFoods(groupId) : []),
    [groupId, getCachedGroupFoods]
  );

  const [formData, setFormData] = useState<CreateMealRequest>({
    pet_id: selectedPet?.id || '',
    food_id: preSelectedFoodId || '',
    fed_at: getCurrentLocalDateTime(),
    meal_type: undefined,
    serving_type: 'units',
    serving_amount: 1,
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load foods when modal opens (only if no cache and not loading)
  useEffect(() => {
    if (isOpen && groupId && shouldFetchGroupFoods(groupId)) {
      getGroupFoods(groupId).catch(error => {
        console.error('Failed to load foods:', error);
      });
    }
  }, [isOpen, groupId, shouldFetchGroupFoods, getGroupFoods]);

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

  const handleInputChange = <K extends keyof CreateMealRequest>(field: K, value: CreateMealRequest[K]) => {
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
        fed_at: formData.fed_at ? datetimeLocalToUtc(formData.fed_at) : undefined,
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
    } catch (error) {
      console.error('❌ CreateMealForm: Error recording meal:', error);

      let errorMessage = 'Failed to record meal';
      if (error && typeof error === 'object' && 'response' in error) {
        const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (detail !== undefined) {
          errorMessage = 'Validation error';
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
      food_id: preSelectedFoodId || '',
      fed_at: getCurrentLocalDateTime(),
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-2 rounded-2xl border border-border-default shadow-elevated max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-2 border-b border-border-subtle px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-accent-pink/15 flex items-center justify-center mr-3">
              <UtensilsCrossed className="w-5 h-5 text-accent-pink" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-text-tertiary hover:text-text-primary transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Pet Info (read-only) */}
          {selectedPet && (
            <div className="bg-surface-1 rounded-xl p-3 border border-border-subtle">
              <p className="text-sm text-text-tertiary mb-1">Feeding</p>
              <p className="font-semibold text-text-primary">{selectedPet.name}</p>
            </div>
          )}

          {/* Date & Time */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.fed_at}
              onChange={(e) => handleInputChange('fed_at', e.target.value)}
              max={getCurrentLocalDateTime()}
              className="input-field"
              disabled={isLoading}
            />
          </div>

          {/* Food Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Select Food *
            </label>
            <select
              value={formData.food_id}
              onChange={(e) => handleInputChange('food_id', e.target.value)}
              className={`input-field ${errors.food_id ? 'border-danger' : ''}`}
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
              <p className="text-danger text-sm mt-1">{errors.food_id}</p>
            )}
          </div>

          {/* Meal Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Meal Type (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleInputChange('meal_type', type === formData.meal_type ? undefined : type)}
                  className={`py-2 px-4 rounded-xl border transition-colors ${
                    formData.meal_type === type
                      ? 'bg-accent-pink/15 border-accent-pink text-accent-pink font-semibold'
                      : 'border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary'
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
            <label className="block text-sm font-medium text-text-secondary mb-2">
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
                className={`input-field flex-1 ${errors.serving_amount ? 'border-danger' : ''}`}
                disabled={isLoading}
              />
              <select
                value={formData.serving_type}
                onChange={(e) => handleInputChange('serving_type', e.target.value as ServingType)}
                className="input-field w-auto"
                disabled={isLoading}
              >
                <option value="units">Units</option>
                <option value="grams">Grams</option>
              </select>
            </div>
            {errors.serving_amount && (
              <p className="text-danger text-sm mt-1">{errors.serving_amount}</p>
            )}

            {/* Calculations Display */}
            {selectedFood && formData.serving_amount > 0 && (
              <div className="mt-2 p-3 bg-surface-1 border border-border-subtle rounded-xl">
                <p className="text-sm text-text-secondary">
                  ≈ {calculations.actualWeightG}g • ~{calculations.estimatedCalories} kcal
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              maxLength={500}
              className={`input-field resize-none ${errors.notes ? 'border-danger' : ''}`}
              disabled={isLoading}
            />
            {errors.notes && (
              <p className="text-danger text-sm mt-1">{errors.notes}</p>
            )}
            <p className="text-xs text-text-tertiary mt-1">
              {formData.notes?.length || 0}/500
            </p>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
              <p className="text-danger text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
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
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
