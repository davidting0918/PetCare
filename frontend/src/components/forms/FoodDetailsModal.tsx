import React, { useState, useEffect, useCallback } from 'react';
import { X, Edit2, Trash2, UtensilsCrossed, Upload, Camera, Apple } from 'lucide-react';
import { foodService } from '../../api';
import { useFood } from '../../hooks';
import { useFileUpload } from '../../hooks/useFileUpload';
import { COLORS } from '../../constants/colors';
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card-3d bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-earth">
            {isEditMode ? 'Edit Food' : 'Food Details'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          ) : food ? (
            isEditMode ? (
              // Edit Mode
              <div className="space-y-6">
                {/* Photo Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-earth mb-2">
                    Photo
                  </label>
                  <div className="flex gap-4">
                    {/* Photo Preview */}
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 flex-shrink-0 relative">
                      {previewUrl ? (
                        <>
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Camera className="w-6 h-6 text-white" />
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
                          <Apple className="w-12 h-12 text-gray-300" />
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
                        className="w-full px-4 py-2 bg-orange text-white rounded-lg hover:bg-orange/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ backgroundColor: COLORS.orange }}
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
                          className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm disabled:opacity-50"
                        >
                          Remove Selected
                        </button>
                      )}
                      {selectedFile && (
                        <p className="text-xs text-gray-500 text-center">
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                  </div>
                  {errors.photo && <p className="text-red-600 text-xs mt-2">{errors.photo}</p>}
                </div>

                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-earth border-b pb-2">Basic Information</h4>

                  {/* Brand */}
                  <div>
                    <label className="block text-sm font-medium text-earth mb-2">
                      Brand *
                    </label>
                    <input
                      type="text"
                      value={formData.brand || ''}
                      onChange={(e) => handleInputChange('brand', e.target.value)}
                      maxLength={100}
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint ${
                        errors.brand ? 'border-red-300' : 'border-mint/30'
                      }`}
                      disabled={isLoading}
                    />
                    {errors.brand && (
                      <p className="text-red-500 text-sm mt-1">{errors.brand}</p>
                    )}
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="block text-sm font-medium text-earth mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={formData.product_name || ''}
                      onChange={(e) => handleInputChange('product_name', e.target.value)}
                      maxLength={100}
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint ${
                        errors.product_name ? 'border-red-300' : 'border-mint/30'
                      }`}
                      disabled={isLoading}
                    />
                    {errors.product_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.product_name}</p>
                    )}
                  </div>

                  {/* Food Type */}
                  <div>
                    <label className="block text-sm font-medium text-earth mb-2">
                      Food Type *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['wet_food', 'dry_food'] as FoodType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleInputChange('food_type', type)}
                          className={`py-2 px-4 rounded-lg border-2 transition-colors ${
                            formData.food_type === type
                              ? 'bg-orange/20 border-orange text-orange font-semibold'
                              : 'border-gray-200 text-gray-600 hover:border-orange/50'
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
                    <label className="block text-sm font-medium text-earth mb-2">
                      Target Pet *
                    </label>
                    <select
                      value={formData.target_pet || 'dog'}
                      onChange={(e) => handleInputChange('target_pet', e.target.value as TargetPet)}
                      className="w-full px-4 py-2 border-2 border-mint/30 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint"
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
                    <label className="block text-sm font-medium text-earth mb-2">
                      Unit Weight (grams) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="5000"
                      value={formData.unit_weight || 0}
                      onChange={(e) => handleInputChange('unit_weight', parseFloat(e.target.value) || 0)}
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint ${
                        errors.unit_weight ? 'border-red-300' : 'border-mint/30'
                      }`}
                      disabled={isLoading}
                    />
                    {errors.unit_weight && (
                      <p className="text-red-500 text-sm mt-1">{errors.unit_weight}</p>
                    )}
                  </div>
                </div>

                {/* Nutritional Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-earth border-b pb-2">Nutritional Facts (per 100g)</h4>

                  {/* Calories */}
                  <div>
                    <label className="block text-sm font-medium text-earth mb-2">
                      Calories (kcal/100g) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1000"
                      value={formData.calories || 0}
                      onChange={(e) => handleInputChange('calories', parseFloat(e.target.value) || 0)}
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint ${
                        errors.calories ? 'border-red-300' : 'border-mint/30'
                      }`}
                      disabled={isLoading}
                    />
                    {errors.calories && (
                      <p className="text-red-500 text-sm mt-1">{errors.calories}</p>
                    )}
                  </div>

                  {/* Protein */}
                  <div>
                    <label className="block text-sm font-medium text-earth mb-2">
                      Protein (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.protein || 0}
                      onChange={(e) => handleInputChange('protein', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border-2 border-mint/30 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Fat */}
                  <div>
                    <label className="block text-sm font-medium text-earth mb-2">
                      Fat (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.fat || 0}
                      onChange={(e) => handleInputChange('fat', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border-2 border-mint/30 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Moisture */}
                  <div>
                    <label className="block text-sm font-medium text-earth mb-2">
                      Moisture (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.moisture || 0}
                      onChange={(e) => handleInputChange('moisture', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border-2 border-mint/30 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Carbohydrate */}
                  <div>
                    <label className="block text-sm font-medium text-earth mb-2">
                      Carbohydrate (%) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.carbohydrate || 0}
                      onChange={(e) => handleInputChange('carbohydrate', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border-2 border-mint/30 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Total Nutrition Display */}
                  {(() => {
                    const totalNutrition = (formData.protein || 0) + (formData.fat || 0) + (formData.moisture || 0) + (formData.carbohydrate || 0);
                    const isNutritionValid = totalNutrition <= 105;
                    return (
                      <div className={`p-3 rounded-lg ${isNutritionValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className={`text-sm font-medium ${isNutritionValid ? 'text-green-700' : 'text-red-700'}`}>
                          Total: {totalNutrition.toFixed(2)}% {isNutritionValid ? '✓' : '⚠️ Exceeds 105%'}
                        </p>
                      </div>
                    );
                  })()}
                  {errors.nutrition && (
                    <p className="text-red-500 text-sm">{errors.nutrition}</p>
                  )}
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
                    onClick={handleCancelEdit}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex-1 btn-3d px-4 py-2 text-white rounded-lg disabled:opacity-50"
                    style={{ backgroundColor: COLORS.orange }}
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
                  <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100">
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
                  <h4 className="font-semibold text-earth mb-3 border-b pb-2">Basic Information</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Brand</p>
                      <p className="font-semibold text-earth">{food.brand}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Product Name</p>
                      <p className="font-semibold text-earth">{food.product_name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-medium text-earth">
                          {food.food_type === 'wet_food' ? 'Wet Food' : 'Dry Food'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Target Pet</p>
                        <p className="font-medium text-earth capitalize">{food.target_pet}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Unit Weight</p>
                      <p className="font-semibold text-earth">{food.unit_weight}g per unit</p>
                    </div>
                  </div>
                </div>

                {/* Nutritional Information */}
                <div>
                  <h4 className="font-semibold text-earth mb-3 border-b pb-2">Nutritional Facts (per 100g)</h4>
                  <div className="space-y-3">
                    <div className="bg-orange/5 rounded-lg p-3">
                      <p className="text-sm text-gray-600">Calories</p>
                      <p className="text-2xl font-bold text-orange">{food.calories} kcal</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Protein</span>
                        <span className="font-semibold text-earth">{food.protein}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min(food.protein, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Fat</span>
                        <span className="font-semibold text-earth">{food.fat}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{ width: `${Math.min(food.fat, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Moisture</span>
                        <span className="font-semibold text-earth">{food.moisture}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-cyan-500 h-2 rounded-full"
                          style={{ width: `${Math.min(food.moisture, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Carbohydrate</span>
                        <span className="font-semibold text-earth">{food.carbohydrate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${Math.min(food.carbohydrate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Per Unit Calculations */}
                <div className="bg-mint/10 rounded-lg p-4 border border-mint/20">
                  <h4 className="font-semibold text-earth mb-2">Per Unit ({food.unit_weight}g)</h4>
                  <p className="text-lg font-bold text-mint">{food.calories_per_unit} kcal</p>
                </div>

                {/* Creator Info */}
                <div className="text-sm text-gray-500">
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
                      className="w-full btn-3d btn-3d-mint px-4 py-3 text-white rounded-lg flex items-center justify-center gap-2"
                    >
                      <UtensilsCrossed className="w-5 h-5" />
                      <span className="font-semibold">Use in Meal</span>
                    </button>
                  )}

                  <div className="flex gap-3">
                    {onEdit && (
                      <button
                        onClick={() => setIsEditMode(true)}
                        className="flex-1 px-4 py-2 border-2 border-mint text-mint rounded-lg hover:bg-mint/10 transition-colors flex items-center justify-center gap-2"
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
                        className="flex-1 px-4 py-2 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
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
