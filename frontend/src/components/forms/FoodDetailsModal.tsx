import React, { useState, useEffect, useCallback } from 'react';
import { X, Edit2, Trash2, UtensilsCrossed, Upload, Camera, Apple } from 'lucide-react';
import { foodService } from '../../api';
import { useFood } from '../../hooks';
import { useFileUpload } from '../../hooks/useFileUpload';
import type { FoodDetails, UpdateFoodRequest, FoodType, TargetPet } from '../../types';

interface FoodDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  foodId: string | null;
  onUseInMeal?: (foodId: string) => void;
  onEdit?: (food: FoodDetails) => void;
  onDelete?: (foodId: string) => void;
  initialEditMode?: boolean;
  onSuccess?: (message: string) => void;
}

export const FoodDetailsModal: React.FC<FoodDetailsModalProps> = ({
  isOpen,
  onClose,
  foodId,
  onUseInMeal,
  onEdit,
  onDelete,
  initialEditMode = false,
  onSuccess
}) => {
  const { updateFood, getGroupFoods } = useFood();

  // Use file upload hook
  const {
    selectedFile,
    previewUrl,
    error: fileError,
    fileInputRef,
    handleFileSelect,
    handleRemoveFile
  } = useFileUpload({
    maxSize: 5 * 1024 * 1024 // 5MB for food photos
  });

  const [food, setFood] = useState<FoodDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [formData, setFormData] = useState<UpdateFoodRequest>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadFoodDetails = useCallback(async () => {
    if (!foodId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await foodService.getFoodDetails(foodId);
      if (response.status === 1 && response.data) {
        setFood(response.data);
        // Initialize form data with food data
        setFormData({
          brand: response.data.brand,
          product_name: response.data.product_name,
          food_type: response.data.food_type,
          target_pet: response.data.target_pet,
          unit_weight: response.data.unit_weight,
          calories: response.data.calories,
          protein: response.data.protein,
          fat: response.data.fat,
          moisture: response.data.moisture,
          carbohydrate: response.data.carbohydrate
        });
        // Use photo_url from database response
        if (response.data.photo_url) {
          setPhotoUrl(response.data.photo_url);
        } else {
          setPhotoUrl('');
        }
      }
    } catch (err) {
      console.error('Error loading food details:', err);
      const message = err instanceof Error ? err.message : 'Failed to load food details';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [foodId]);

  useEffect(() => {
    if (isOpen && foodId) {
      loadFoodDetails();
      setIsEditMode(initialEditMode);
    }
  }, [isOpen, foodId, initialEditMode, loadFoodDetails]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Sync file upload error with form errors
  useEffect(() => {
    if (fileError) {
      setErrors(prev => ({ ...prev, photo: fileError }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.photo;
        return newErrors;
      });
    }
  }, [fileError]);

  const handleInputChange = <K extends keyof UpdateFoodRequest>(field: K, value: UpdateFoodRequest[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.brand !== undefined && !formData.brand.trim()) {
      newErrors.brand = 'Brand is required';
    } else if (formData.brand && formData.brand.length > 100) {
      newErrors.brand = 'Brand must be 100 characters or less';
    }

    if (formData.product_name !== undefined && !formData.product_name.trim()) {
      newErrors.product_name = 'Product name is required';
    } else if (formData.product_name && formData.product_name.length > 100) {
      newErrors.product_name = 'Product name must be 100 characters or less';
    }

    if (formData.unit_weight !== undefined && formData.unit_weight <= 0) {
      newErrors.unit_weight = 'Unit weight must be greater than 0';
    } else if (formData.unit_weight !== undefined && formData.unit_weight > 5000) {
      newErrors.unit_weight = 'Unit weight must be less than 5000g';
    }

    if (formData.calories !== undefined && (formData.calories < 0 || formData.calories > 1000)) {
      newErrors.calories = 'Calories must be between 0-1000 per 100g';
    }

    const totalNutrition = (formData.protein || 0) + (formData.fat || 0) + (formData.moisture || 0) + (formData.carbohydrate || 0);
    if (totalNutrition > 105) {
      newErrors.nutrition = 'Total nutritional percentages cannot exceed 105%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!food || !foodId) return;

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Update food information
      const updateRequest: UpdateFoodRequest = {
        brand: formData.brand?.trim(),
        product_name: formData.product_name?.trim(),
        food_type: formData.food_type,
        target_pet: formData.target_pet,
        unit_weight: formData.unit_weight,
        calories: formData.calories,
        protein: formData.protein,
        fat: formData.fat,
        moisture: formData.moisture,
        carbohydrate: formData.carbohydrate
      };

      await updateFood(foodId, food.group_id, updateRequest);

      // Upload photo if selected
      if (selectedFile) {
        try {
          await foodService.uploadFoodPhoto(foodId, selectedFile);
        } catch (photoError) {
          console.error('Error uploading photo:', photoError);
          setErrors({ submit: 'Food updated but photo upload failed. Please try uploading the photo again.' });
          setIsLoading(false);
          return;
        }
      }

      // Refresh food details and food list
      await loadFoodDetails();
      await getGroupFoods(food.group_id);

      setIsEditMode(false);
      onSuccess?.('Food updated successfully!');
    } catch (error) {
      console.error('Error updating food:', error);
      const message = error instanceof Error ? error.message : 'Failed to update food';
      setErrors({ submit: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (food) {
      // Reset form data to original food data
      setFormData({
        brand: food.brand,
        product_name: food.product_name,
        food_type: food.food_type,
        target_pet: food.target_pet,
        unit_weight: food.unit_weight,
        calories: food.calories,
        protein: food.protein,
        fat: food.fat,
        moisture: food.moisture,
        carbohydrate: food.carbohydrate
      });
    }
    handleRemoveFile();
    setErrors({});
    setIsEditMode(false);
  };

  const handleClose = () => {
    setFood(null);
    setPhotoUrl('');
    setError(null);
    setIsEditMode(false);
    handleRemoveFile();
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-2 rounded-2xl border border-border-default shadow-elevated max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-2 border-b border-border-subtle px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">
            {isEditMode ? 'Edit Food' : 'Food Details'}
          </h3>
          <button
            onClick={handleClose}
            className="text-text-tertiary hover:text-text-primary transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto"></div>
              <p className="text-text-secondary mt-4">Loading...</p>
            </div>
          ) : error ? (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-4">
              <p className="text-danger text-sm">{error}</p>
            </div>
          ) : food ? (
            isEditMode ? (
              // Edit Mode
              <div className="space-y-6">
                {/* Photo Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Photo
                  </label>
                  <div className="flex gap-4">
                    {/* Photo Preview */}
                    <div className="w-32 h-32 rounded-xl overflow-hidden bg-surface-1 border border-border-subtle flex-shrink-0 relative">
                      {previewUrl ? (
                        <>
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Camera className="w-6 h-6 text-text-primary" />
                          </div>
                        </>
                      ) : photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={`${food.brand} ${food.product_name}`}
                          className="w-full h-full object-cover"
                          onError={() => setPhotoUrl('')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Apple className="w-12 h-12 text-text-tertiary" />
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
                        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">
                          {selectedFile ? 'Change Photo' : 'Upload Photo'}
                        </span>
                      </button>
                      {selectedFile && (
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          disabled={isLoading}
                          className="btn-secondary w-full text-sm disabled:opacity-50"
                        >
                          Remove Selected
                        </button>
                      )}
                      {selectedFile && (
                        <p className="text-xs text-text-tertiary text-center">
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  </div>
                  {errors.photo && <p className="text-danger text-xs mt-2">{errors.photo}</p>}
                </div>

                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-text-primary border-b border-border-subtle pb-2">Basic Information</h4>

                  {/* Brand */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Brand *
                    </label>
                    <input
                      type="text"
                      value={formData.brand || ''}
                      onChange={(e) => handleInputChange('brand', e.target.value)}
                      maxLength={100}
                      className={`input-field ${errors.brand ? 'border-danger' : ''}`}
                      disabled={isLoading}
                    />
                    {errors.brand && (
                      <p className="text-danger text-sm mt-1">{errors.brand}</p>
                    )}
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={formData.product_name || ''}
                      onChange={(e) => handleInputChange('product_name', e.target.value)}
                      maxLength={100}
                      className={`input-field ${errors.product_name ? 'border-danger' : ''}`}
                      disabled={isLoading}
                    />
                    {errors.product_name && (
                      <p className="text-danger text-sm mt-1">{errors.product_name}</p>
                    )}
                  </div>

                  {/* Food Type */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Food Type *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['wet_food', 'dry_food'] as FoodType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleInputChange('food_type', type)}
                          className={`py-2 px-4 rounded-xl border transition-colors ${
                            formData.food_type === type
                              ? 'bg-accent-blue/15 border-accent-blue text-accent-blue font-semibold'
                              : 'border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary'
                          }`}
                          disabled={isLoading}
                        >
                          {type === 'wet_food' ? 'Wet Food' : 'Dry Food'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Pet */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Target Pet *
                    </label>
                    <select
                      value={formData.target_pet || 'dog'}
                      onChange={(e) => handleInputChange('target_pet', e.target.value as TargetPet)}
                      className="input-field"
                      disabled={isLoading}
                    >
                      <option value="dog">Dog</option>
                      <option value="cat">Cat</option>
                      <option value="bird">Bird</option>
                      <option value="fish">Fish</option>
                      <option value="rabbit">Rabbit</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Unit Weight */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Unit Weight (grams) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="5000"
                      value={formData.unit_weight || 0}
                      onChange={(e) => handleInputChange('unit_weight', parseFloat(e.target.value) || 0)}
                      className={`input-field ${errors.unit_weight ? 'border-danger' : ''}`}
                      disabled={isLoading}
                    />
                    {errors.unit_weight && (
                      <p className="text-danger text-sm mt-1">{errors.unit_weight}</p>
                    )}
                  </div>
                </div>

                {/* Nutritional Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-text-primary border-b border-border-subtle pb-2">Nutritional Facts (per 100g)</h4>

                  {/* Calories */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Calories (kcal/100g) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1000"
                      value={formData.calories || 0}
                      onChange={(e) => handleInputChange('calories', parseFloat(e.target.value) || 0)}
                      className={`input-field ${errors.calories ? 'border-danger' : ''}`}
                      disabled={isLoading}
                    />
                    {errors.calories && (
                      <p className="text-danger text-sm mt-1">{errors.calories}</p>
                    )}
                  </div>

                  {/* Protein */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Protein (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.protein || 0}
                      onChange={(e) => handleInputChange('protein', parseFloat(e.target.value) || 0)}
                      className="input-field"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Fat */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Fat (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.fat || 0}
                      onChange={(e) => handleInputChange('fat', parseFloat(e.target.value) || 0)}
                      className="input-field"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Moisture */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Moisture (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.moisture || 0}
                      onChange={(e) => handleInputChange('moisture', parseFloat(e.target.value) || 0)}
                      className="input-field"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Carbohydrate */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Carbohydrate (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.carbohydrate || 0}
                      onChange={(e) => handleInputChange('carbohydrate', parseFloat(e.target.value) || 0)}
                      className="input-field"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Total Nutrition Display */}
                  {(() => {
                    const totalNutrition = (formData.protein || 0) + (formData.fat || 0) + (formData.moisture || 0) + (formData.carbohydrate || 0);
                    const isNutritionValid = totalNutrition <= 105;
                    return (
                      <div className={`p-3 rounded-xl border ${isNutritionValid ? 'bg-success/10 border-success/30' : 'bg-danger/10 border-danger/30'}`}>
                        <p className={`text-sm font-medium ${isNutritionValid ? 'text-success' : 'text-danger'}`}>
                          Total: {totalNutrition.toFixed(2)}% {isNutritionValid ? '✓' : '⚠️ Exceeds 105%'}
                        </p>
                      </div>
                    );
                  })()}
                  {errors.nutrition && (
                    <p className="text-danger text-sm">{errors.nutrition}</p>
                  )}
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
                    onClick={handleCancelEdit}
                    className="btn-secondary flex-1"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="btn-primary flex-1 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="space-y-6">
                {/* Food Photo */}
                {photoUrl && (
                  <div className="w-full h-48 rounded-xl overflow-hidden bg-surface-1 border border-border-subtle">
                    <img
                      src={photoUrl}
                      alt={`${food.brand} ${food.product_name}`}
                      className="w-full h-full object-cover"
                      onError={() => setPhotoUrl('')}
                    />
                  </div>
                )}

                {/* Basic Information */}
                <div>
                  <h4 className="font-semibold text-text-primary mb-3 border-b border-border-subtle pb-2">Basic Information</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-text-tertiary">Brand</p>
                      <p className="font-semibold text-text-primary">{food.brand}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-tertiary">Product Name</p>
                      <p className="font-semibold text-text-primary">{food.product_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-text-tertiary">Type</p>
                        <p className="font-medium text-text-primary">
                          {food.food_type === 'wet_food' ? 'Wet Food' : 'Dry Food'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-tertiary">Target Pet</p>
                        <p className="font-medium text-text-primary capitalize">{food.target_pet}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-text-tertiary">Unit Weight</p>
                      <p className="font-semibold text-text-primary">{food.unit_weight}g per unit</p>
                    </div>
                  </div>
                </div>

                {/* Nutritional Information */}
                <div>
                  <h4 className="font-semibold text-text-primary mb-3 border-b border-border-subtle pb-2">Nutritional Facts (per 100g)</h4>
                  <div className="space-y-3">
                    <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-xl p-3">
                      <p className="text-sm text-text-tertiary">Calories</p>
                      <p className="text-2xl font-bold text-accent-blue">{food.calories} kcal</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-tertiary">Protein</span>
                        <span className="font-semibold text-text-primary">{food.protein}%</span>
                      </div>
                      <div className="w-full bg-surface-1 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-accent-blue h-2 rounded-full"
                          style={{ width: `${Math.min(food.protein, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-tertiary">Fat</span>
                        <span className="font-semibold text-text-primary">{food.fat}%</span>
                      </div>
                      <div className="w-full bg-surface-1 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-warning h-2 rounded-full"
                          style={{ width: `${Math.min(food.fat, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-tertiary">Moisture</span>
                        <span className="font-semibold text-text-primary">{food.moisture}%</span>
                      </div>
                      <div className="w-full bg-surface-1 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-accent-teal h-2 rounded-full"
                          style={{ width: `${Math.min(food.moisture, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-tertiary">Carbohydrate</span>
                        <span className="font-semibold text-text-primary">{food.carbohydrate}%</span>
                      </div>
                      <div className="w-full bg-surface-1 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-accent-purple h-2 rounded-full"
                          style={{ width: `${Math.min(food.carbohydrate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Per Unit Calculations */}
                <div className="bg-accent-pink/10 rounded-xl p-4 border border-accent-pink/30">
                  <h4 className="font-semibold text-text-primary mb-2">Per Unit ({food.unit_weight}g)</h4>
                  <p className="text-lg font-bold text-accent-pink">{food.calories_per_unit} kcal</p>
                </div>

                {/* Creator Info */}
                <div className="text-sm text-text-tertiary">
                  <p>Created by: {food.creator_name}</p>
                  <p>Group: {food.group_name}</p>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4">
                  {onUseInMeal && (
                    <button
                      onClick={() => {
                        onUseInMeal(food.id);
                        handleClose();
                      }}
                      className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                    >
                      <UtensilsCrossed className="w-5 h-5" />
                      <span>Use in Meal</span>
                    </button>
                  )}

                  <div className="flex gap-3">
                    {onEdit && (
                      <button
                        onClick={() => setIsEditMode(true)}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this food?')) {
                            onDelete(food.id);
                            handleClose();
                          }
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-danger/40 text-danger hover:bg-danger/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
};
