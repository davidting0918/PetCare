import React, { useState, useEffect, useMemo } from 'react';
import { UtensilsCrossed, X, Search, Trash2 } from 'lucide-react';
import { useMeal, useFood } from '../../hooks';
import { formatForDateTimeLocal, datetimeLocalToUtc, getCurrentLocalDateTime } from '../../utils/dateUtils';
import type { UpdateMealRequest, MealType, ServingType, MealDetails } from '../../types';

interface UpdateMealFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  mealDetails: MealDetails | null;
}

export const UpdateMealForm: React.FC<UpdateMealFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mealDetails
}) => {
  const { update, deleteMeal } = useMeal();
  const { getCachedGroupFoods, shouldFetchGroupFoods, getGroupFoods } = useFood();

  const groupId = mealDetails?.group_id;
  // Memoize so referential identity is stable across renders — required because
  // it feeds the dependency arrays of filteredFoods / selectedFood useMemos below.
  const foods = useMemo(
    () => (groupId ? getCachedGroupFoods(groupId) : []),
    [groupId, getCachedGroupFoods]
  );

  const [formData, setFormData] = useState<UpdateMealRequest>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize form data when meal details change
  useEffect(() => {
    if (mealDetails) {
      setFormData({
        food_id: mealDetails.food_id,
        fed_at: formatForDateTimeLocal(mealDetails.timestamp),
        meal_type: mealDetails.meal_type || undefined,
        serving_type: mealDetails.serving_type,
        serving_amount: mealDetails.serving_amount,
        notes: mealDetails.notes || ''
      });
    }
  }, [mealDetails]);

  // Load foods when modal opens (only if no cache and not loading)
  useEffect(() => {
    if (isOpen && groupId && shouldFetchGroupFoods(groupId)) {
      getGroupFoods(groupId).catch(error => {
        console.error('Failed to load foods:', error);
      });
    }
  }, [isOpen, groupId, shouldFetchGroupFoods, getGroupFoods]);

  // Filter foods based on search
  const filteredFoods = useMemo(() => {
    if (!searchQuery) return foods;
    const query = searchQuery.toLowerCase();
    return foods.filter(food =>
      food.brand.toLowerCase().includes(query) ||
      food.product_name.toLowerCase().includes(query)
    );
  }, [foods, searchQuery]);

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

  const handleInputChange = <K extends keyof UpdateMealRequest>(field: K, value: UpdateMealRequest[K]) => {
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

    if (formData.serving_amount !== undefined) {
      if (formData.serving_amount <= 0) {
        newErrors.serving_amount = 'Serving amount must be greater than 0';
      } else if (formData.serving_amount > 10000) {
        newErrors.serving_amount = 'Serving amount must be less than 10000';
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

    if (!validateForm() || !mealDetails) return;

    setIsLoading(true);
    try {
      const submitData: UpdateMealRequest = {};

      if (formData.food_id !== mealDetails.food_id) submitData.food_id = formData.food_id;
      if (formData.fed_at) submitData.fed_at = datetimeLocalToUtc(formData.fed_at);
      if (formData.meal_type !== mealDetails.meal_type) submitData.meal_type = formData.meal_type;
      if (formData.serving_type !== mealDetails.serving_type) submitData.serving_type = formData.serving_type;
      if (formData.serving_amount !== mealDetails.serving_amount) submitData.serving_amount = formData.serving_amount;
      if (formData.notes !== mealDetails.notes) submitData.notes = formData.notes?.trim() || undefined;

      await update(mealDetails.id, mealDetails.pet_id, submitData);

      onSuccess?.('Meal updated successfully!');
      handleClose();
    } catch (error) {
      console.error('Error updating meal:', error);
      const message = error instanceof Error ? error.message : 'Failed to update meal';
      setErrors({ submit: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!mealDetails) return;

    setIsLoading(true);
    try {
      await deleteMeal(mealDetails.id, mealDetails.pet_id);
      onSuccess?.('Meal deleted successfully!');
      handleClose();
    } catch (error) {
      console.error('Error deleting meal:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete meal';
      setErrors({ submit: message });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    setErrors({});
    setSearchQuery('');
    setShowDeleteConfirm(false);
    onClose();
  };

  if (!isOpen || !mealDetails) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-2 rounded-2xl border border-border-default shadow-elevated max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-2 border-b border-border-subtle px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-accent-pink/15 flex items-center justify-center mr-3">
              <UtensilsCrossed className="w-5 h-5 text-accent-pink" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Edit Meal</h3>
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
          {/* Pet Info */}
          <div className="bg-surface-1 rounded-xl p-3 border border-border-subtle">
            <p className="text-sm text-text-tertiary mb-1">Pet</p>
            <p className="font-semibold text-text-primary">{mealDetails.pet_name}</p>
          </div>

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
              Food
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary z-10" />
              <input
                type="text"
                placeholder="Search food..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
                disabled={isLoading}
              />
            </div>
            <select
              value={formData.food_id}
              onChange={(e) => handleInputChange('food_id', e.target.value)}
              className="input-field"
              disabled={isLoading}
            >
              {filteredFoods.map((food) => (
                <option key={food.id} value={food.id}>
                  {food.brand} - {food.product_name}
                </option>
              ))}
            </select>
          </div>

          {/* Meal Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Meal Type
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
              Serving Size
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="10000"
                value={formData.serving_amount}
                onChange={(e) => handleInputChange('serving_amount', parseFloat(e.target.value) || 0)}
                className="input-field flex-1"
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

            {selectedFood && formData.serving_amount && formData.serving_amount > 0 && (
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
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              maxLength={500}
              className="input-field resize-none"
              disabled={isLoading}
            />
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
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2.5 rounded-xl border border-danger/40 text-danger hover:bg-danger/10 transition-colors"
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
              className="btn-primary flex-1 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-surface-2 rounded-2xl border border-border-default shadow-elevated p-6 max-w-sm w-full">
            <h4 className="text-lg font-semibold text-text-primary mb-2">Delete Meal?</h4>
            <p className="text-text-secondary mb-4">
              Are you sure you want to delete this meal record? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold bg-danger text-text-primary hover:bg-danger/90 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
