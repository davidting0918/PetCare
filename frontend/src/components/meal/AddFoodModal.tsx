import React, { useState } from 'react';
import {
  X,
  Camera,
  Save,
  Star,
  AlertCircle
} from 'lucide-react';

interface AddFoodModalProps {
  onClose: () => void;
}

type FoodCategory = 'dry-food' | 'wet-food' | 'treat' | 'supplement';

interface NewFood {
  name: string;
  brand: string;
  caloriesPerUnit: number;
  unit: string;
  category: FoodCategory;
  isFavorite: boolean;
  photo?: string;
  notes?: string;
}

interface FormErrors {
  name?: string;
  brand?: string;
  caloriesPerUnit?: string;
}

export const AddFoodModal: React.FC<AddFoodModalProps> = ({ onClose }) => {
  const [newFood, setNewFood] = useState<NewFood>({
    name: '',
    brand: '',
    caloriesPerUnit: 0,
    unit: 'cup',
    category: 'dry-food',
    isFavorite: false,
    photo: '',
    notes: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: { id: FoodCategory; label: string; icon: string }[] = [
    { id: 'dry-food', label: 'Dry Food', icon: '🥘' },
    { id: 'wet-food', label: 'Wet Food', icon: '🥫' },
    { id: 'treat', label: 'Treats', icon: '🦴' },
    { id: 'supplement', label: 'Supplements', icon: '💊' }
  ];

  const units = ['cup', 'gram', 'can', 'piece', 'tablespoon', 'ounce'];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!newFood.name.trim()) {
      newErrors.name = 'Food name is required';
    }

    if (!newFood.brand.trim()) {
      newErrors.brand = 'Brand name is required';
    }

    if (newFood.caloriesPerUnit <= 0) {
      newErrors.caloriesPerUnit = 'Calories must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Here you would typically save to your data store
      console.log('Adding new food:', newFood);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      onClose();
    } catch (error) {
      console.error('Failed to add food:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof NewFood, value: any) => {
    setNewFood(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field as keyof FormErrors]: undefined }));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you'd upload this to a server
      // For now, we'll create a local URL
      const imageUrl = URL.createObjectURL(file);
      handleInputChange('photo', imageUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-primary w-full max-w-md h-[90vh] rounded-t-3xl overflow-hidden shadow-3d">
        {/* Header */}
        <div className="bg-white p-4 shadow-3d">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Add New Food</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Photo Upload */}
          <div className="card-3d p-4">
            <h3 className="font-medium text-gray-800 mb-3">Food Photo</h3>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange transition-colors"
              >
                {newFood.photo ? (
                  <img
                    src={newFood.photo}
                    alt="Food preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Tap to add photo</p>
                    <p className="text-xs text-gray-500">Optional but recommended</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Basic Information */}
          <div className="card-3d p-4 space-y-4">
            <h3 className="font-medium text-gray-800">Basic Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Food Name *
              </label>
              <input
                type="text"
                value={newFood.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Royal Canin Adult"
                className={`input-3d w-full ${errors.name ? 'border-red-300 focus:border-red-500' : ''}`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand *
              </label>
              <input
                type="text"
                value={newFood.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="e.g., Royal Canin"
                className={`input-3d w-full ${errors.brand ? 'border-red-300 focus:border-red-500' : ''}`}
              />
              {errors.brand && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.brand}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleInputChange('category', category.id)}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                      newFood.category === category.id
                        ? 'btn-3d btn-3d-mint text-gray-700'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <span className="block">{category.icon}</span>
                    <span className="text-xs">{category.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Nutritional Information */}
          <div className="card-3d p-4 space-y-4">
            <h3 className="font-medium text-gray-800">Nutritional Information</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calories *
                </label>
                <input
                  type="number"
                  value={newFood.caloriesPerUnit || ''}
                  onChange={(e) => handleInputChange('caloriesPerUnit', parseFloat(e.target.value) || 0)}
                  placeholder="350"
                  className={`input-3d w-full ${errors.caloriesPerUnit ? 'border-red-300 focus:border-red-500' : ''}`}
                />
                {errors.caloriesPerUnit && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.caloriesPerUnit}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Per Unit
                </label>
                <select
                  value={newFood.unit}
                  onChange={(e) => handleInputChange('unit', e.target.value)}
                  className="input-3d w-full"
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Example:</strong> If this food contains 350 calories per cup,
                enter "350" for calories and select "cup" as the unit.
              </p>
            </div>
          </div>

          {/* Additional Options */}
          <div className="card-3d p-4 space-y-4">
            <h3 className="font-medium text-gray-800">Additional Options</h3>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newFood.isFavorite}
                  onChange={(e) => handleInputChange('isFavorite', e.target.checked)}
                  className="mr-3"
                />
                <Star className={`w-4 h-4 mr-2 ${newFood.isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                <span className="text-gray-700">Add to favorites</span>
              </label>
              <p className="text-xs text-gray-500 ml-9 mt-1">
                Favorite foods appear first in the food selection
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={newFood.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes about this food..."
                rows={3}
                className="input-3d w-full resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pb-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-3d w-full py-3 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Adding Food...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Save className="w-4 h-4 mr-2" />
                  Add Food
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
