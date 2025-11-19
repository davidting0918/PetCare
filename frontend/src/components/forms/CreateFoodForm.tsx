import React, { useState, useRef, useEffect } from 'react';
import { Apple, X, Upload, Camera } from 'lucide-react';
import { useFood } from '../../hooks';
import { foodService } from '../../api';
import type { CreateFoodRequest, FoodType, TargetPet } from '../../types';

interface CreateFoodFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  groupId: string;
}

export const CreateFoodForm: React.FC<CreateFoodFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  groupId
}) => {
  const { createFood } = useFood();

  const [formData, setFormData] = useState<CreateFoodRequest>({
    brand: '',
    product_name: '',
    food_type: 'wet_food',
    target_pet: 'dog',
    unit_weight: 100,
    calories: 100,
    protein: 10,
    fat: 5,
    moisture: 75,
    carbohydrate: 5
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors({ ...errors, photo: 'Please upload a JPEG, PNG, GIF, or WebP image' });
      return;
    }

    // Validate file size (5MB for food photos)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors({ ...errors, photo: 'File is too large. Maximum size is 5MB' });
      return;
    }

    // Clear previous errors
    const newErrors = { ...errors };
    delete newErrors.photo;
    setErrors(newErrors);

    // Set file and create preview
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    const newErrors = { ...errors };
    delete newErrors.photo;
    setErrors(newErrors);
  };

  const handleInputChange = (field: keyof CreateFoodRequest, value: any) => {
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

  // Calculate total nutrition percentage
  const totalNutrition = formData.protein + formData.fat + formData.moisture + formData.carbohydrate;
  const isNutritionValid = totalNutrition <= 105; // Allow 5% tolerance

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.brand.trim()) {
      newErrors.brand = 'Brand is required';
    } else if (formData.brand.length > 100) {
      newErrors.brand = 'Brand must be 100 characters or less';
    }

    if (!formData.product_name.trim()) {
      newErrors.product_name = 'Product name is required';
    } else if (formData.product_name.length > 100) {
      newErrors.product_name = 'Product name must be 100 characters or less';
    }

    if (formData.unit_weight <= 0) {
      newErrors.unit_weight = 'Unit weight must be greater than 0';
    } else if (formData.unit_weight > 5000) {
      newErrors.unit_weight = 'Unit weight must be less than 5000g';
    }

    if (formData.calories < 0 || formData.calories > 1000) {
      newErrors.calories = 'Calories must be between 0-1000 per 100g';
    }

    if (!isNutritionValid) {
      newErrors.nutrition = 'Total nutritional percentages cannot exceed 105%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Create food and get the created food details
      const createResponse = await foodService.createFood(groupId, {
        ...formData,
        brand: formData.brand.trim(),
        product_name: formData.product_name.trim()
      });

      // Update Redux store by calling the hook action (this will update the cache)
      await createFood(groupId, {
        ...formData,
        brand: formData.brand.trim(),
        product_name: formData.product_name.trim()
      });

      // Upload photo if selected
      if (selectedFile && createResponse.status === 1 && createResponse.data) {
        try {
          await foodService.uploadFoodPhoto(createResponse.data.id, selectedFile);
        } catch (photoError: any) {
          console.error('Error uploading photo:', photoError);
          // Don't fail the whole operation if photo upload fails
          setErrors({ submit: 'Food created but photo upload failed. Please try uploading the photo again.' });
          return; // Return early to show the error message
        }
      }

      onSuccess?.('Food added successfully!');
      handleClose();
    } catch (error: any) {
      console.error('Error creating food:', error);
      setErrors({ submit: error.message || 'Failed to create food' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      brand: '',
      product_name: '',
      food_type: 'wet_food',
      target_pet: 'dog',
      unit_weight: 100,
      calories: 100,
      protein: 10,
      fat: 5,
      moisture: 75,
      carbohydrate: 5
    });
    setErrors({});
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card-3d bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-orange/20 flex items-center justify-center mr-3">
              <Apple className="w-5 h-5 text-orange" />
            </div>
            <h3 className="text-lg font-semibold text-earth">Add New Food</h3>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Photo Upload Section */}
          <div>
            <label className="block text-sm font-medium text-earth mb-2">
              Photo (Optional)
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
                  style={{ backgroundColor: '#F4C2A1' }}
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">
                    {selectedFile ? 'Change Photo' : 'Upload Photo'}
                  </span>
                </button>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
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

          {/* Basic Information Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-earth border-b pb-2">Basic Information</h4>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium text-earth mb-2">
                Brand *
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="e.g., Royal Canin"
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
                value={formData.product_name}
                onChange={(e) => handleInputChange('product_name', e.target.value)}
                placeholder="e.g., Adult Medium"
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
                value={formData.target_pet}
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
                value={formData.unit_weight}
                onChange={(e) => handleInputChange('unit_weight', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 400"
                className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint ${
                  errors.unit_weight ? 'border-red-300' : 'border-mint/30'
                }`}
                disabled={isLoading}
              />
              {errors.unit_weight && (
                <p className="text-red-500 text-sm mt-1">{errors.unit_weight}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Weight of one unit (can, cup, etc.)</p>
            </div>
          </div>

          {/* Nutritional Information Section */}
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
                value={formData.calories}
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
                value={formData.protein}
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
                value={formData.fat}
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
                value={formData.moisture}
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
                value={formData.carbohydrate}
                onChange={(e) => handleInputChange('carbohydrate', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 border-2 border-mint/30 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint"
                disabled={isLoading}
              />
            </div>

            {/* Total Nutrition Display */}
            <div className={`p-3 rounded-lg ${isNutritionValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-medium ${isNutritionValid ? 'text-green-700' : 'text-red-700'}`}>
                Total: {totalNutrition.toFixed(2)}% {isNutritionValid ? '✓' : '⚠️ Exceeds 105%'}
              </p>
            </div>
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
              onClick={handleClose}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-3d px-4 py-2 text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#F4C2A1' }}
              disabled={isLoading || !isNutritionValid}
            >
              {isLoading ? 'Adding...' : 'Add Food'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
