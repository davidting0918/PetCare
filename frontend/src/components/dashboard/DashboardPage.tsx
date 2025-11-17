import React from 'react';
import { Activity, TrendingUp, Utensils, Calendar, BarChart3, LineChart } from 'lucide-react';
import { usePet } from '../../hooks';
import { getPhotoUrl } from '../../api';

export const DashboardPage: React.FC = () => {
  const { selectedPet } = usePet();

  if (!selectedPet) {
    return (
      <div className="p-4">
        <div className="card-3d p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-orange/20 rounded-full flex items-center justify-center">
            <Activity className="w-8 h-8 text-orange" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Pet Selected</h3>
        </div>
      </div>
    );
  }

  const petPhotoUrl = getPhotoUrl(selectedPet.photo_url);

  return (
    <div className="p-4 space-y-4 lg:p-6">
      {/* Pet Summary Card */}
      <div className="card-3d p-6">
        <div className="flex items-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden shadow-3d">
            {petPhotoUrl ? (
              <img
                src={petPhotoUrl}
                alt={selectedPet.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-orange/30 flex items-center justify-center text-earth font-semibold text-2xl">
                {selectedPet.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="ml-4 flex-1">
            <h2 className="text-2xl font-bold text-earth">{selectedPet.name}</h2>
            <p className="text-gray-600">
              {selectedPet.breed} • {selectedPet.pet_type}
            </p>
            {selectedPet.gender && (
              <p className="text-sm text-gray-500 capitalize">{selectedPet.gender}</p>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Current Weight</p>
            <p className="text-lg font-semibold text-earth">
              {selectedPet.current_weight_kg ? `${selectedPet.current_weight_kg} kg` : '-'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Target Weight</p>
            <p className="text-lg font-semibold text-earth">
              {selectedPet.target_weight_kg ? `${selectedPet.target_weight_kg} kg` : '-'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Daily Target</p>
            <p className="text-lg font-semibold text-earth">
              {selectedPet.daily_calorie_target || 0} kcal
            </p>
          </div>
        </div>
      </div>

      {/* Cards Grid - 1 column mobile, 2 columns desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Daily Calorie Intake Card */}
        <div className="card-3d p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-orange/20 flex items-center justify-center mr-3">
                <BarChart3 className="w-5 h-5 text-orange" />
              </div>
              <h3 className="text-lg font-semibold text-earth">Daily Calorie Intake</h3>
            </div>
          </div>

          {/* Empty Chart Placeholder */}
          <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-200">
            <div className="text-center text-gray-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No calorie data available</p>
              <p className="text-xs mt-1">Start logging meals to see daily intake</p>
            </div>
          </div>
        </div>

        {/* Weight Trend Card */}
        <div className="card-3d p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-mint/20 flex items-center justify-center mr-3">
                <TrendingUp className="w-5 h-5 text-mint" />
              </div>
              <h3 className="text-lg font-semibold text-earth">Weight Trend</h3>
            </div>
          </div>

          {/* Empty Chart Placeholder */}
          <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-200">
            <div className="text-center text-gray-400">
              <LineChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No weight records available</p>
              <p className="text-xs mt-1">Track weight regularly to see progress</p>
            </div>
          </div>
        </div>

        {/* Meal History Card */}
        <div className="card-3d p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-orange/20 flex items-center justify-center mr-3">
                <Utensils className="w-5 h-5 text-orange" />
              </div>
              <h3 className="text-lg font-semibold text-earth">Recent Meals</h3>
            </div>
          </div>

          {/* Empty List Placeholder */}
          <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-200">
            <div className="text-center text-gray-400">
              <Utensils className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No meals recorded yet</p>
              <p className="text-xs mt-1">Use the Meal tab to log your pet's food</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Summary Card */}
        <div className="card-3d p-5">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-earth/20 flex items-center justify-center mr-3">
            <Activity className="w-5 h-5 text-earth" />
          </div>
          <h3 className="text-lg font-semibold text-earth">Quick Stats</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
              <p className="text-xs text-gray-500">Total Meals</p>
            </div>
            <p className="text-2xl font-bold text-earth">0</p>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <BarChart3 className="w-4 h-4 text-gray-400 mr-2" />
              <p className="text-xs text-gray-500">Avg Daily Calories</p>
            </div>
            <p className="text-2xl font-bold text-earth">0</p>
            <p className="text-xs text-gray-400 mt-1">kcal per day</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
