import React, { useState } from 'react';
import {
  X,
  Search,
  Star,
  Plus,
  Minus,
  Check,
  Clock,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { mockFoods, mockFamilyMembers } from '../../data/mockData';
import type { Food } from '../../types';

interface FoodSelectionModalProps {
  petId: string;
  onClose: () => void;
}

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type FoodCategory = 'all' | 'favorites' | 'dry-food' | 'wet-food' | 'treat' | 'supplement';

export const FoodSelectionModal: React.FC<FoodSelectionModalProps> = ({
  petId,
  onClose
}) => {
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory>('favorites');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState('family1');
  const [step, setStep] = useState<'select' | 'amount' | 'confirm'>('select');

  // Filter foods based on category and search
  const filteredFoods = mockFoods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' ||
                          (selectedCategory === 'favorites' && food.isFavorite) ||
                          food.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Common portion sizes
  const portionPresets = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

  const calculateCalories = () => {
    return selectedFood ? Math.round(selectedFood.caloriesPerUnit * amount) : 0;
  };

  const handleFoodSelect = (food: Food) => {
    setSelectedFood(food);
    setStep('amount');
  };

  const handleLogMeal = () => {
    if (!selectedFood) return;

    // Here you would typically save to your data store
    console.log('Logging meal:', {
      petId,
      foodId: selectedFood.id,
      amount,
      calories: calculateCalories(),
      mealType,
      timestamp: new Date(),
      loggedBy: selectedFamilyMember
    });

    onClose();
  };

  const getMealTypeTime = (type: MealType) => {
    const times = {
      breakfast: '08:00',
      lunch: '12:00',
      dinner: '18:00',
      snack: '15:00'
    };
    return times[type];
  };

  const categories: { id: FoodCategory; label: string; icon: string }[] = [
    { id: 'favorites', label: 'Favorites', icon: '⭐' },
    { id: 'all', label: 'All Foods', icon: '🍽️' },
    { id: 'dry-food', label: 'Dry Food', icon: '🥘' },
    { id: 'wet-food', label: 'Wet Food', icon: '🥫' },
    { id: 'treat', label: 'Treats', icon: '🦴' },
    { id: 'supplement', label: 'Supplements', icon: '💊' }
  ];

  const mealTypes: { id: MealType; label: string; icon: string }[] = [
    { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { id: 'lunch', label: 'Lunch', icon: '☀️' },
    { id: 'dinner', label: 'Dinner', icon: '🌙' },
    { id: 'snack', label: 'Snack', icon: '🍪' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-primary w-full max-w-md h-[85vh] rounded-t-3xl overflow-hidden shadow-3d">
        {/* Header */}
        <div className="bg-white p-4 shadow-3d">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {step === 'select' && 'Select Food'}
              {step === 'amount' && 'Enter Amount'}
              {step === 'confirm' && 'Confirm Meal'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center mt-3 space-x-2">
            {['select', 'amount', 'confirm'].map((s, index) => (
              <div key={s} className="flex items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step === s ? 'bg-orange text-white' :
                  ['select', 'amount', 'confirm'].indexOf(step) > index ? 'bg-mint text-gray-700' : 'bg-gray-200 text-gray-500'
                }`}>
                  {['select', 'amount', 'confirm'].indexOf(step) > index ? <Check className="w-3 h-3" /> : index + 1}
                </div>
                {index < 2 && <div className="w-8 h-0.5 bg-gray-200 mx-1"></div>}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Food Selection */}
          {step === 'select' && (
            <>
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for food..."
                  className="input-3d pl-10 w-full"
                />
              </div>

              {/* Category Tabs */}
              <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      selectedCategory === category.id
                        ? 'btn-3d btn-3d-mint text-gray-700'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-1">{category.icon}</span>
                    {category.label}
                  </button>
                ))}
              </div>

              {/* Food Grid */}
              <div className="grid grid-cols-2 gap-3">
                {filteredFoods.map(food => (
                  <button
                    key={food.id}
                    onClick={() => handleFoodSelect(food)}
                    className="card-3d p-3 text-left hover:shadow-3d-hover transition-all duration-200"
                  >
                    <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={food.photo || 'https://via.placeholder.com/120x120?text=Food'}
                        alt={food.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-800 text-sm truncate">
                          {food.name}
                        </h4>
                        {food.isFavorite && (
                          <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        {food.caloriesPerUnit} cal/{food.unit}
                      </p>
                      <div className="inline-block px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 capitalize">
                        {food.category.replace('-', ' ')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Amount Input */}
          {step === 'amount' && selectedFood && (
            <>
              {/* Selected Food Display */}
              <div className="card-3d p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={selectedFood.photo || 'https://via.placeholder.com/64x64?text=Food'}
                      alt={selectedFood.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{selectedFood.name}</h3>
                    <p className="text-sm text-gray-600">
                      {selectedFood.caloriesPerUnit} calories per {selectedFood.unit}
                    </p>
                  </div>
                </div>
              </div>

              {/* Portion Presets */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-800 mb-2">Quick Portions</h4>
                <div className="grid grid-cols-4 gap-2">
                  {portionPresets.map(preset => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset)}
                      className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                        amount === preset
                          ? 'bg-orange text-white shadow-3d'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {preset} {preset === 1 ? selectedFood.unit : `${selectedFood.unit}s`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div className="card-3d p-4 mb-4">
                <h4 className="font-medium text-gray-800 mb-3">Custom Amount</h4>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setAmount(Math.max(0.25, amount - 0.25))}
                    className="btn-3d p-2 text-gray-700"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="flex-1 text-center">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      step="0.25"
                      min="0"
                      className="input-3d text-center text-xl font-semibold w-24"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedFood.unit}{amount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <button
                    onClick={() => setAmount(amount + 0.25)}
                    className="btn-3d p-2 text-gray-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Calorie Display */}
              <div className="bg-orange/10 border-2 border-orange/20 rounded-lg p-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange">{calculateCalories()}</p>
                  <p className="text-sm text-gray-600">calories</p>
                </div>
              </div>

              {/* Meal Type Selection */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-800 mb-2">Meal Type</h4>
                <div className="grid grid-cols-2 gap-2">
                  {mealTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setMealType(type.id)}
                      className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                        mealType === type.id
                          ? 'btn-3d btn-3d-mint text-gray-700'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center justify-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {getMealTypeTime(type.id)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep('confirm')}
                className="btn-3d w-full py-3 text-white font-medium"
              >
                Continue to Confirmation
              </button>
            </>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && selectedFood && (
            <>
              {/* Meal Summary */}
              <div className="card-3d p-4 mb-4">
                <h4 className="font-medium text-gray-800 mb-3">Meal Summary</h4>

                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={selectedFood.photo || 'https://via.placeholder.com/48x48?text=Food'}
                      alt={selectedFood.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-800">{selectedFood.name}</h5>
                    <p className="text-sm text-gray-600">
                      {amount} {selectedFood.unit}{amount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange">{calculateCalories()}</p>
                    <p className="text-xs text-gray-600">calories</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Meal Type:</span>
                    <span className="font-medium text-gray-800 capitalize flex items-center">
                      {mealTypes.find(t => t.id === mealType)?.icon} {mealType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium text-gray-800">
                      {format(new Date(), 'HH:mm')} (Now)
                    </span>
                  </div>
                </div>
              </div>

              {/* Family Member Selection */}
              <div className="card-3d p-4 mb-4">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Who's feeding?
                </h4>
                <div className="space-y-2">
                  {mockFamilyMembers.map(member => (
                    <label key={member.id} className="flex items-center">
                      <input
                        type="radio"
                        name="familyMember"
                        value={member.id}
                        checked={selectedFamilyMember === member.id}
                        onChange={(e) => setSelectedFamilyMember(e.target.value)}
                        className="mr-3"
                      />
                      <span className="text-gray-700">{member.name}</span>
                      <span className="ml-auto text-xs text-gray-500 capitalize">
                        {member.role}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setStep('amount')}
                  className="btn-3d btn-3d-mint py-3 text-gray-700 font-medium"
                >
                  Back to Edit
                </button>
                <button
                  onClick={handleLogMeal}
                  className="btn-3d py-3 text-white font-medium"
                >
                  Log Meal
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
