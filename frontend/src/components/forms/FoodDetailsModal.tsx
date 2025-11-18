import React, { useState, useEffect } from 'react';

import { X, Edit2, Trash2, UtensilsCrossed } from 'lucide-react';
import { foodService } from '../../api';
import type { FoodDetails } from '../../types';

interface FoodDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  foodId: string | null;
  onUseInMeal?: (foodId: string) => void;
  onEdit?: (food: FoodDetails) => void;
  onDelete?: (foodId: string) => void;
}

export const FoodDetailsModal: React.FC<FoodDetailsModalProps> = ({
  isOpen,
  onClose,
  foodId,
  onUseInMeal,
  onEdit,
  onDelete
}) => {
  const [food, setFood] = useState<FoodDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && foodId) {
      loadFoodDetails();
    }
  }, [isOpen, foodId]);

  const loadFoodDetails = async () => {
    if (!foodId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await foodService.getFoodDetails(foodId);
      if (response.status === 1 && response.data) {
        setFood(response.data);
        if (response.data.has_photo) {
          setPhotoUrl(foodService.getFoodPhotoUrl(foodId));
        }
      }
    } catch (err: any) {
      console.error('Error loading food details:', err);
      setError(err.message || 'Failed to load food details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFood(null);
    setPhotoUrl('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card-3d bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-earth">Food Details</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
                      onClick={() => {
                        onEdit(food);
                        handleClose();
                      }}
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
          ) : null}
        </div>
      </div>
    </div>
  );
};
