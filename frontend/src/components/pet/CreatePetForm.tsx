import React, { useState, useRef } from 'react';
import { PawPrint, Camera, Calendar, Heart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CreatePetFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  isVisible: boolean;
  className?: string;
}

export const CreatePetForm: React.FC<CreatePetFormProps> = ({
  onSuccess,
  onCancel,
  isVisible,
  className = ""
}) => {
  const { createPet } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    pet_type: 'dog',
    breed: '',
    birth_date: '',
    current_weight_kg: 5,
    height_cm: 30,
    is_spayed: false,
    daily_calorie_target: 400,
    photo: null as File | null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const target = e.target as HTMLInputElement;

    setCreateFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? target.checked : type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSliderChange = (name: string, value: number) => {
    setCreateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleToggleChange = (name: string, value: boolean) => {
    setCreateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCreateFormData(prev => ({
        ...prev,
        photo: file
      }));
    }
  };

  const triggerPhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCreatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const petData = {
        name: createFormData.name.trim(),
        pet_type: createFormData.pet_type,
        breed: createFormData.breed.trim() || undefined,
        birth_date: createFormData.birth_date || undefined,
        current_weight_kg: createFormData.current_weight_kg || undefined,
        height_cm: createFormData.height_cm || undefined,
        is_spayed: createFormData.is_spayed,
        daily_calorie_target: createFormData.daily_calorie_target || undefined,
        // TODO: Handle photo upload to backend
        photo_url: undefined // Will be implemented when backend supports file upload
      };

      await createPet(petData);

      // Reset form and call success callback
      resetForm();
      onSuccess();

    } catch (error) {
      alert('Failed to create pet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCreateFormData({
      name: '',
      pet_type: 'dog',
      breed: '',
      birth_date: '',
      current_weight_kg: 5,
      height_cm: 30,
      is_spayed: false,
      daily_calorie_target: 400,
      photo: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelCreate = () => {
    resetForm();
    onCancel();
  };

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        /* Custom slider styles with project colors and gradients */
        .slider-weight::-webkit-slider-thumb {
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, #F4C2A1 0%, #e8b690 100%);
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15), 0 0 0 2px #F4C2A1;
          transition: all 0.2s ease;
        }

        .slider-height::-webkit-slider-thumb {
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, #B8E6D3 0%, #a3d8c4 100%);
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15), 0 0 0 2px #B8E6D3;
          transition: all 0.2s ease;
        }

        .slider-calorie::-webkit-slider-thumb {
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8D7053 0%, #7a6147 100%);
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15), 0 0 0 2px #8D7053;
          transition: all 0.2s ease;
        }

        .slider-weight::-webkit-slider-thumb:hover,
        .slider-height::-webkit-slider-thumb:hover,
        .slider-calorie::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2), 0 0 0 3px currentColor;
        }

        .slider-weight::-moz-range-thumb,
        .slider-height::-moz-range-thumb,
        .slider-calorie::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          transition: all 0.2s ease;
        }

        .slider-weight::-moz-range-thumb {
          background: linear-gradient(135deg, #F4C2A1 0%, #e8b690 100%);
        }

        .slider-height::-moz-range-thumb {
          background: linear-gradient(135deg, #B8E6D3 0%, #a3d8c4 100%);
        }

        .slider-calorie::-moz-range-thumb {
          background: linear-gradient(135deg, #8D7053 0%, #7a6147 100%);
        }

        /* Slider track styles */
        .slider-weight::-webkit-slider-track,
        .slider-height::-webkit-slider-track,
        .slider-calorie::-webkit-slider-track {
          height: 8px;
          border-radius: 4px;
          border: none;
          outline: none;
        }

        .slider-weight::-moz-range-track,
        .slider-height::-moz-range-track,
        .slider-calorie::-moz-range-track {
          height: 8px;
          border-radius: 4px;
          border: none;
          outline: none;
        }

        /* Gradient input field styles */
        .gradient-input {
          background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .gradient-input:focus {
          outline: none;
          border-color: currentColor;
          box-shadow: 0 0 0 3px currentColor;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .gradient-input.weight-input:focus {
          border-color: #F4C2A1;
          box-shadow: 0 0 0 3px rgba(244, 194, 161, 0.2);
        }

        .gradient-input.height-input:focus {
          border-color: #B8E6D3;
          box-shadow: 0 0 0 3px rgba(184, 230, 211, 0.2);
        }

        .gradient-input.calorie-input:focus {
          border-color: #8D7053;
          box-shadow: 0 0 0 3px rgba(141, 112, 83, 0.2);
        }
      `}</style>

      <div className={`card-3d p-6 max-w-md mx-auto mb-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <PawPrint className="w-5 h-5 text-orange mr-2" />
          Create New Pet
        </h3>

        <form onSubmit={handleCreatePet} className="space-y-6">
          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Pet Photo
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                {createFormData.photo ? (
                  <img
                    src={URL.createObjectURL(createFormData.photo)}
                    alt="Pet preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={triggerPhotoUpload}
                  className="btn-3d btn-3d-mint text-white px-4 py-2 text-sm"
                  disabled={isLoading}
                >
                  {createFormData.photo ? 'Change Photo' : 'Upload Photo'}
                </button>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Pet Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pet Name *
            </label>
            <input
              type="text"
              name="name"
              value={createFormData.name}
              onChange={handleCreateFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange focus:border-orange"
              placeholder="Enter pet name"
              required
            />
          </div>

          {/* Pet Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pet Type *
            </label>
            <select
              name="pet_type"
              value={createFormData.pet_type}
              onChange={handleCreateFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange focus:border-orange"
              required
            >
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
              <option value="bird">Bird</option>
              <option value="rabbit">Rabbit</option>
              <option value="fish">Fish</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Breed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Breed
            </label>
            <input
              type="text"
              name="breed"
              value={createFormData.breed}
              onChange={handleCreateFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange focus:border-orange"
              placeholder="e.g., Golden Retriever"
            />
          </div>

          {/* Birth Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Birth Date
            </label>
            <input
              type="date"
              name="birth_date"
              value={createFormData.birth_date}
              onChange={handleCreateFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange focus:border-orange"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Is Spayed Toggle */}
          <div>
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <Heart className="w-4 h-4 mr-2 text-pink-500" />
                <span className="text-sm font-medium text-gray-700">Spayed/Neutered</span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  name="is_spayed"
                  checked={createFormData.is_spayed}
                  onChange={handleCreateFormChange}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => handleToggleChange('is_spayed', !createFormData.is_spayed)}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                    createFormData.is_spayed ? 'bg-orange' : 'bg-gray-300'
                  }`}
                  style={{
                    background: createFormData.is_spayed
                      ? 'linear-gradient(135deg, #F4C2A1 0%, #e8b690 100%)'
                      : '#d1d5db'
                  }}
                  disabled={isLoading}
                >
                  <span
                    className={`block w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      createFormData.is_spayed ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </label>
          </div>

          {/* Weight Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Current Weight
            </label>
            <div className="space-y-3">
              {/* Input + Slider Combo */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={createFormData.current_weight_kg}
                    onChange={(e) => handleSliderChange('current_weight_kg', parseFloat(e.target.value) || 0.1)}
                    min="0.1"
                    max="100"
                    step="0.1"
                    className="gradient-input weight-input w-full px-4 py-2 text-center text-lg font-semibold text-gray-800"
                    style={{ color: '#F4C2A1' }}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                    kg
                  </div>
                </div>
                <div className="text-2xl text-gray-400">⚖️</div>
              </div>

              {/* Gradient Slider */}
              <div className="relative">
                <input
                  type="range"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={createFormData.current_weight_kg}
                  onChange={(e) => handleSliderChange('current_weight_kg', parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer slider-weight"
                  style={{
                    background: `linear-gradient(to right,
                      #F4C2A1 0%,
                      #F4C2A1 ${((createFormData.current_weight_kg - 0.1) / (100 - 0.1)) * 100}%,
                      rgba(244, 194, 161, 0.2) ${((createFormData.current_weight_kg - 0.1) / (100 - 0.1)) * 100}%,
                      rgba(244, 194, 161, 0.2) 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>0.1 kg</span>
                  <span className="text-orange font-medium">{createFormData.current_weight_kg} kg</span>
                  <span>100 kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Height Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Height
            </label>
            <div className="space-y-3">
              {/* Input + Slider Combo */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={createFormData.height_cm}
                    onChange={(e) => handleSliderChange('height_cm', parseInt(e.target.value) || 5)}
                    min="5"
                    max="200"
                    step="1"
                    className="gradient-input height-input w-full px-4 py-2 text-center text-lg font-semibold text-gray-800"
                    style={{ color: '#B8E6D3' }}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                    cm
                  </div>
                </div>
                <div className="text-2xl text-gray-400">📏</div>
              </div>

              {/* Gradient Slider */}
              <div className="relative">
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="1"
                  value={createFormData.height_cm}
                  onChange={(e) => handleSliderChange('height_cm', parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer slider-height"
                  style={{
                    background: `linear-gradient(to right,
                      #B8E6D3 0%,
                      #B8E6D3 ${((createFormData.height_cm - 5) / (200 - 5)) * 100}%,
                      rgba(184, 230, 211, 0.2) ${((createFormData.height_cm - 5) / (200 - 5)) * 100}%,
                      rgba(184, 230, 211, 0.2) 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>5 cm</span>
                  <span className="text-mint font-medium">{createFormData.height_cm} cm</span>
                  <span>200 cm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Calorie Target Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Daily Calorie Target
            </label>
            <div className="space-y-3">
              {/* Input + Slider Combo */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={createFormData.daily_calorie_target}
                    onChange={(e) => handleSliderChange('daily_calorie_target', parseInt(e.target.value) || 50)}
                    min="50"
                    max="3000"
                    step="10"
                    className="gradient-input calorie-input w-full px-4 py-2 text-center text-lg font-semibold text-gray-800"
                    style={{ color: '#8D7053' }}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                    cal
                  </div>
                </div>
                <div className="text-2xl text-gray-400">🍖</div>
              </div>

              {/* Gradient Slider */}
              <div className="relative">
                <input
                  type="range"
                  min="50"
                  max="3000"
                  step="10"
                  value={createFormData.daily_calorie_target}
                  onChange={(e) => handleSliderChange('daily_calorie_target', parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer slider-calorie"
                  style={{
                    background: `linear-gradient(to right,
                      #8D7053 0%,
                      #8D7053 ${((createFormData.daily_calorie_target - 50) / (3000 - 50)) * 100}%,
                      rgba(141, 112, 83, 0.2) ${((createFormData.daily_calorie_target - 50) / (3000 - 50)) * 100}%,
                      rgba(141, 112, 83, 0.2) 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>50 cal</span>
                  <span className="text-earth font-medium">{createFormData.daily_calorie_target} cal</span>
                  <span>3000 cal</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isLoading || !createFormData.name.trim()}
              className="flex-1 btn-3d btn-3d-orange text-white py-2 px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Pet'}
            </button>
            <button
              type="button"
              onClick={handleCancelCreate}
              disabled={isLoading}
              className="flex-1 btn-3d btn-3d-earth text-white py-2 px-4 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
