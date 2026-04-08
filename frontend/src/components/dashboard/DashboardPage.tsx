import React from 'react';
import { Activity, TrendingUp, Utensils, Calendar, BarChart3, LineChart } from 'lucide-react';
import { usePet } from '../../hooks';

export const DashboardPage: React.FC = () => {
  const { selectedPet } = usePet();

  if (!selectedPet) {
    return (
      <div className="p-4">
        <div className="surface-card p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-accent-pink/15 rounded-full flex items-center justify-center">
            <Activity className="w-8 h-8 text-accent-pink" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Pet Selected</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 lg:p-6">
      {/* Pet Summary Card */}
      <div className="surface-card p-6">
        <div className="flex items-center mb-4">
          <div className="w-20 h-20 rounded-full bg-surface-2 flex-shrink-0 overflow-hidden shadow-card">
            {selectedPet.photo_url ? (
              <img
                src={selectedPet.photo_url}
                alt={selectedPet.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-accent-pink/15 flex items-center justify-center text-accent-pink font-semibold text-2xl">
                {selectedPet.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="ml-4 flex-1">
            <h2 className="text-2xl font-bold text-text-primary">{selectedPet.name}</h2>
            <p className="text-text-secondary">
              {selectedPet.breed} • {selectedPet.pet_type}
            </p>
            {selectedPet.gender && (
              <p className="text-sm text-text-tertiary capitalize">{selectedPet.gender}</p>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border-subtle">
          <div className="text-center">
            <p className="text-xs text-text-tertiary mb-1">Current Weight</p>
            <p className="text-lg font-semibold text-text-primary">
              {selectedPet.current_weight_kg ? `${selectedPet.current_weight_kg} kg` : '-'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-tertiary mb-1">Target Weight</p>
            <p className="text-lg font-semibold text-text-primary">
              {selectedPet.target_weight_kg ? `${selectedPet.target_weight_kg} kg` : '-'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-tertiary mb-1">Daily Target</p>
            <p className="text-lg font-semibold text-text-primary">
              {selectedPet.daily_calorie_target || 0} kcal
            </p>
          </div>
        </div>
      </div>

      {/* Cards Grid - 1 column mobile, 2 columns desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Daily Calorie Intake Card — pink accent (primary, nutrition) */}
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-accent-pink/15 flex items-center justify-center mr-3">
                <BarChart3 className="w-5 h-5 text-accent-pink" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">Daily Calorie Intake</h3>
            </div>
          </div>

          {/* Empty Chart Placeholder */}
          <div className="bg-surface-2 rounded-xl p-8 border-2 border-dashed border-border-subtle">
            <div className="text-center text-text-tertiary">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No calorie data available</p>
              <p className="text-xs mt-1">Start logging meals to see daily intake</p>
            </div>
          </div>
        </div>

        {/* Weight Trend Card — teal accent (success, growth) */}
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-accent-teal/15 flex items-center justify-center mr-3">
                <TrendingUp className="w-5 h-5 text-accent-teal" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">Weight Trend</h3>
            </div>
          </div>

          {/* Empty Chart Placeholder */}
          <div className="bg-surface-2 rounded-xl p-8 border-2 border-dashed border-border-subtle">
            <div className="text-center text-text-tertiary">
              <LineChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No weight records available</p>
              <p className="text-xs mt-1">Track weight regularly to see progress</p>
            </div>
          </div>
        </div>

        {/* Recent Meals Card — purple accent (history, log) */}
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-accent-purple/15 flex items-center justify-center mr-3">
                <Utensils className="w-5 h-5 text-accent-purple" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">Recent Meals</h3>
            </div>
          </div>

          {/* Empty List Placeholder */}
          <div className="bg-surface-2 rounded-xl p-8 border-2 border-dashed border-border-subtle">
            <div className="text-center text-text-tertiary">
              <Utensils className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No meals recorded yet</p>
              <p className="text-xs mt-1">Use the Meal tab to log your pet's food</p>
            </div>
          </div>
        </div>

        {/* Quick Stats Summary Card — blue accent (info, summary) */}
        <div className="surface-card p-5">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-accent-blue/15 flex items-center justify-center mr-3">
              <Activity className="w-5 h-5 text-accent-blue" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Quick Stats</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-2 rounded-xl p-4">
              <div className="flex items-center mb-2">
                <Calendar className="w-4 h-4 text-text-tertiary mr-2" />
                <p className="text-xs text-text-tertiary">Total Meals</p>
              </div>
              <p className="text-2xl font-bold text-text-primary">0</p>
              <p className="text-xs text-text-tertiary mt-1">All time</p>
            </div>

            <div className="bg-surface-2 rounded-xl p-4">
              <div className="flex items-center mb-2">
                <BarChart3 className="w-4 h-4 text-text-tertiary mr-2" />
                <p className="text-xs text-text-tertiary">Avg Daily Calories</p>
              </div>
              <p className="text-2xl font-bold text-text-primary">0</p>
              <p className="text-xs text-text-tertiary mt-1">kcal per day</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
