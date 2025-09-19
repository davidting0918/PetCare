import React, { useState } from 'react';
import {
  X,
  Target,
  TrendingDown,
  TrendingUp,
  Calendar,
  Stethoscope,
  Save,
  AlertCircle,
  Info
} from 'lucide-react';
import { format, addWeeks } from 'date-fns';
import { mockPets, getLatestWeightEntry } from '../../data/mockData';

interface GoalSettingModalProps {
  petId: string;
  onClose: () => void;
}

export const GoalSettingModal: React.FC<GoalSettingModalProps> = ({
  petId,
  onClose
}) => {
  const pet = mockPets.find(p => p.id === petId);
  const latestWeight = getLatestWeightEntry(petId);

  const [targetWeight, setTargetWeight] = useState<number>(pet?.targetWeight || latestWeight?.weight || 25);
  const [targetDate, setTargetDate] = useState<Date>(addWeeks(new Date(), 12));
  const [vetRecommendation, setVetRecommendation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_goalType, setGoalType] = useState<'lose' | 'gain' | 'maintain'>('lose');

  if (!pet || !latestWeight) return null;

  const currentWeight = latestWeight.weight;
  const weightDifference = targetWeight - currentWeight;
  const isWeightLoss = weightDifference < 0;
  const isWeightGain = weightDifference > 0;
  const isMaintain = Math.abs(weightDifference) < 0.1;

  // Calculate recommended rate (0.5-2% per week for dogs, 1-3% per month for cats)
  const getRecommendedRate = () => {
    const isdog = pet.breed?.toLowerCase().includes('retriever') || pet.breed?.toLowerCase().includes('shepherd');
    if (isdog) {
      return {
        weekly: currentWeight * 0.01, // 1% per week max
        display: '0.5-1% per week'
      };
    } else {
      return {
        weekly: currentWeight * 0.005, // 0.5% per week max for cats
        display: '0.5% per week'
      };
    }
  };

  const recommendedRate = getRecommendedRate();
  const weeksToGoal = Math.abs(weightDifference) / recommendedRate.weekly;
  const recommendedDate = addWeeks(new Date(), Math.ceil(weeksToGoal));

  const handleTargetWeightChange = (value: number) => {
    setTargetWeight(Math.round(value * 10) / 10);

    // Auto-detect goal type
    const diff = value - currentWeight;
    if (Math.abs(diff) < 0.1) {
      setGoalType('maintain');
    } else if (diff < 0) {
      setGoalType('lose');
    } else {
      setGoalType('gain');
    }
  };

  const getHealthyWeightRange = () => {
    // Rough estimate based on breed (this would come from a breed database in a real app)
    const isLargeDog = pet.breed?.toLowerCase().includes('retriever') || pet.breed?.toLowerCase().includes('shepherd');
    const isCat = pet.breed?.toLowerCase().includes('shorthair') || pet.breed?.toLowerCase().includes('cat');

    if (isLargeDog) {
      return { min: 25, max: 32, ideal: 27 };
    } else if (isCat) {
      return { min: 3.5, max: 5.5, ideal: 4.2 };
    } else {
      return { min: currentWeight * 0.85, max: currentWeight * 1.15, ideal: currentWeight * 0.95 };
    }
  };

  const healthyRange = getHealthyWeightRange();

  const getGoalFeedback = () => {
    if (targetWeight < healthyRange.min) {
      return {
        type: 'warning',
        message: 'This target might be too low. Consider consulting your vet.',
        icon: <AlertCircle className="w-4 h-4" />
      };
    } else if (targetWeight > healthyRange.max) {
      return {
        type: 'warning',
        message: 'This target might be too high. Consider consulting your vet.',
        icon: <AlertCircle className="w-4 h-4" />
      };
    } else if (Math.abs(weightDifference) > currentWeight * 0.2) {
      return {
        type: 'info',
        message: 'This is a significant weight change. Consider a gradual approach.',
        icon: <Info className="w-4 h-4" />
      };
    } else if (weeksToGoal > 52) {
      return {
        type: 'info',
        message: 'This is a long-term goal. Consider setting interim milestones.',
        icon: <Info className="w-4 h-4" />
      };
    } else {
      return {
        type: 'success',
        message: 'This looks like a healthy and achievable goal!',
        icon: <Target className="w-4 h-4" />
      };
    }
  };

  const goalFeedback = getGoalFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      // Here you would update the pet's target weight

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      onClose();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-primary w-full max-w-md max-h-[90vh] rounded-3xl overflow-hidden shadow-3d flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 shadow-3d flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Set Weight Goal</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current vs Target */}
          <div className="card-3d p-4">
            <h3 className="font-medium text-gray-800 mb-3">Weight Comparison</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Current</p>
                <p className="text-2xl font-bold text-gray-800">{currentWeight}kg</p>
              </div>
              <div className="text-center p-3 bg-mint/20 rounded-lg">
                <p className="text-sm text-gray-600">Target</p>
                <p className="text-2xl font-bold text-earth">{targetWeight}kg</p>
              </div>
            </div>

            <div className="mt-3 p-2 bg-gray-50 rounded-lg text-center">
              <div className="flex items-center justify-center space-x-2">
                {isWeightLoss && <TrendingDown className="w-4 h-4 text-green-500" />}
                {isWeightGain && <TrendingUp className="w-4 h-4 text-blue-500" />}
                {isMaintain && <Target className="w-4 h-4 text-gray-500" />}
                <span className="font-medium text-gray-800">
                  {isMaintain ? 'Maintain current weight' :
                   isWeightLoss ? `Lose ${Math.abs(weightDifference).toFixed(1)}kg` :
                   `Gain ${weightDifference.toFixed(1)}kg`}
                </span>
              </div>
            </div>
          </div>

          {/* Target Weight Slider */}
          <div className="card-3d p-4">
            <h3 className="font-medium text-gray-800 mb-3">Target Weight</h3>

            <div className="space-y-4">
              <input
                type="range"
                min={Math.max(1, healthyRange.min)}
                max={healthyRange.max + 5}
                step="0.1"
                value={targetWeight}
                onChange={(e) => handleTargetWeightChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #EF4444 0%, #F59E0B ${((healthyRange.min - Math.max(1, healthyRange.min)) / (healthyRange.max + 5 - Math.max(1, healthyRange.min))) * 100}%, #10B981 ${((healthyRange.min - Math.max(1, healthyRange.min)) / (healthyRange.max + 5 - Math.max(1, healthyRange.min))) * 100}%, #10B981 ${((healthyRange.max - Math.max(1, healthyRange.min)) / (healthyRange.max + 5 - Math.max(1, healthyRange.min))) * 100}%, #EF4444 ${((healthyRange.max - Math.max(1, healthyRange.min)) / (healthyRange.max + 5 - Math.max(1, healthyRange.min))) * 100}%)`
                }}
              />

              <div className="flex justify-between text-xs text-gray-500">
                <span>{Math.max(1, healthyRange.min)}kg</span>
                <span className="text-green-600 font-medium">Healthy Range</span>
                <span>{(healthyRange.max + 5).toFixed(1)}kg</span>
              </div>

              <div className="text-center">
                <input
                  type="number"
                  value={targetWeight}
                  onChange={(e) => handleTargetWeightChange(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="1"
                  className="input-3d text-center text-xl font-bold w-32"
                />
                <p className="text-sm text-gray-600 mt-1">kg</p>
              </div>
            </div>
          </div>

          {/* Goal Feedback */}
          <div className={`card-3d p-4 border-l-4 ${
            goalFeedback.type === 'success' ? 'border-green-500 bg-green-50' :
            goalFeedback.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
            'border-blue-500 bg-blue-50'
          }`}>
            <div className="flex items-start space-x-2">
              <span className={`mt-0.5 ${
                goalFeedback.type === 'success' ? 'text-green-600' :
                goalFeedback.type === 'warning' ? 'text-yellow-600' :
                'text-blue-600'
              }`}>
                {goalFeedback.icon}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-800">{goalFeedback.message}</p>
                {!isMaintain && (
                  <p className="text-xs text-gray-600 mt-1">
                    Recommended rate: {recommendedRate.display} •
                    Estimated time: {Math.ceil(weeksToGoal)} weeks
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card-3d p-4">
            <h3 className="font-medium text-gray-800 mb-3">
              <Calendar className="w-4 h-4 inline mr-1" />
              Goal Timeline
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={format(targetDate, 'yyyy-MM-dd')}
                  onChange={(e) => setTargetDate(new Date(e.target.value))}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="input-3d w-full"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Recommended target date:</strong> {format(recommendedDate, 'MMM dd, yyyy')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Based on safe weight change rate of {recommendedRate.display}
                </p>
              </div>
            </div>
          </div>

          {/* Vet Recommendations */}
          <div className="card-3d p-4">
            <h3 className="font-medium text-gray-800 mb-3">
              <Stethoscope className="w-4 h-4 inline mr-1" />
              Veterinary Input
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vet Recommendations (Optional)
                </label>
                <textarea
                  value={vetRecommendation}
                  onChange={(e) => setVetRecommendation(e.target.value)}
                  placeholder="e.g., Ideal weight: 27kg, reduce treats, increase exercise..."
                  rows={3}
                  className="input-3d w-full resize-none text-sm"
                />
              </div>

              <div className="p-3 bg-orange/10 rounded-lg border border-orange/20">
                <p className="text-sm text-gray-800">
                  <strong>Healthy Weight Range for {pet.breed}:</strong>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {healthyRange.min}kg - {healthyRange.max}kg (Ideal: ~{healthyRange.ideal}kg)
                </p>
              </div>
            </div>
          </div>

          {/* Milestones */}
          {!isMaintain && Math.abs(weightDifference) > 1 && (
            <div className="card-3d p-4">
              <h3 className="font-medium text-gray-800 mb-3">Suggested Milestones</h3>
              <div className="space-y-2">
                {[25, 50, 75].map(percentage => {
                  const milestoneWeight = currentWeight + (weightDifference * percentage / 100);
                  return (
                    <div key={percentage} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-800">
                        {percentage}% to goal
                      </span>
                      <span className="text-sm text-gray-600">
                        {milestoneWeight.toFixed(1)}kg
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-primary pt-4 pb-6 mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-3d w-full py-4 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving Goal...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Save className="w-4 h-4 mr-2" />
                  Save Weight Goal
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
