import React, { useState } from 'react';
import {
  Camera,
  Plus,
  Target,
  TrendingUp,
  Star,
  Calendar,
  ChevronRight,
  Utensils
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import {
  getTodayMeals,
  mockMealEntries,
  mockFoods
} from '../../data/mockData';
import { FoodSelectionModal } from './FoodSelectionModal';
import { AddFoodModal } from './AddFoodModal';
import { MealHistoryModal } from './MealHistoryModal';

// Custom Tooltip Component for Calorie Chart
const CalorieLineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const caloriesData = payload.find((p: any) => p.dataKey === 'calories');
    const goalData = payload.find((p: any) => p.dataKey === 'goal');

    if (caloriesData && goalData) {
      const calories = caloriesData.value;
      const goal = goalData.value;
      const percentageNum = (calories / goal) * 100;
      const percentageStr = percentageNum.toFixed(0);
      const remaining = goal - calories;

      return (
        <div className="bg-white p-3 rounded-lg shadow-3d border border-gray-200 text-sm">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Consumed:</span>
              <span className="font-medium text-mint">{calories} cal</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Goal:</span>
              <span className="font-medium text-orange">{goal} cal</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Progress:</span>
              <span className={`font-medium ${percentageNum > 100 ? 'text-red-600' : percentageNum > 90 ? 'text-yellow-600' : 'text-green-600'}`}>
                {percentageStr}%
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <span className="text-gray-600">
                {remaining >= 0 ? 'Remaining:' : 'Over limit:'}
              </span>
              <span className={`font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(remaining)} cal
              </span>
            </div>
          </div>
        </div>
      );
    }
  }
  return null;
};

export const MealPage: React.FC = () => {
  const { selectedPet } = useAuth();
  const [showFoodSelection, setShowFoodSelection] = useState(false);
  const [showAddFood, setShowAddFood] = useState(false);
  const [showMealHistory, setShowMealHistory] = useState(false);

  if (!selectedPet) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Please select a pet to track meals</p>
      </div>
    );
  }

  const todayMeals = getTodayMeals(selectedPet.id);
  const todayCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0);
  const calorieGoal = selectedPet.dailyCalorieGoal || selectedPet.daily_calorie_target || 0;
  const remainingCalories = calorieGoal - todayCalories;
  const progressPercentage = calorieGoal > 0 ? Math.min((todayCalories / calorieGoal) * 100, 100) : 0;

  // Prepare 7-day calorie chart data
  const sevenDayData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayMeals = mockMealEntries.filter(meal =>
      meal.petId === selectedPet.id &&
      meal.timestamp.toDateString() === date.toDateString()
    );
    const dayCalories = dayMeals.reduce((sum, meal) => sum + meal.calories, 0);

    sevenDayData.push({
      date: format(date, 'MM/dd'),
      calories: dayCalories,
      goal: calorieGoal,
      isToday: i === 0
    });
  }

  // Get recent meal photos
  const recentMealPhotos = todayMeals.slice(0, 6);

  // Get calorie status color
  const getCalorieStatusColor = () => {
    if (calorieGoal === 0) return 'text-gray-600 bg-gray-100';
    const percentage = (todayCalories / calorieGoal) * 100;
    if (percentage <= 70) return 'text-green-600 bg-green-100';
    if (percentage <= 90) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      case 'snack': return '🍪';
      default: return '🍽️';
    }
  };

  return (
    <>
      <div className="p-4 space-y-4 pb-6">
        {/* Today's Calorie Progress Header */}
        <div className="card-3d p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Target className="w-5 h-5 text-orange mr-2" />
              <h2 className="font-semibold text-gray-800">Today's Calories</h2>
            </div>
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${getCalorieStatusColor()}`}>
              {todayCalories} / {calorieGoal}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium text-gray-800">{progressPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  progressPercentage <= 70 ? 'progress-gradient' :
                  progressPercentage <= 90 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-gradient-to-r from-red-400 to-red-500'
                }`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {remainingCalories >= 0
                  ? `${remainingCalories} calories left`
                  : `${Math.abs(remainingCalories)} calories over limit`
                }
              </span>
              <span className="text-gray-600">{todayMeals.length} meals logged</span>
            </div>
          </div>
        </div>

        {/* Last 7 Days Chart */}
        <div className="card-3d p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Last 7 Days Calories</h3>
            <TrendingUp className="w-5 h-5 text-mint" />
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sevenDayData}>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <Tooltip content={<CalorieLineTooltip />} cursor={{ stroke: '#B8E6D3', strokeWidth: 2 }} />
                <Line
                  type="monotone"
                  dataKey="calories"
                  stroke="#B8E6D3"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, stroke: '#B8E6D3', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="goal"
                  stroke="#F4C2A1"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
            <div className="flex items-center">
              <div className="w-3 h-0.5 bg-mint mr-1"></div>
              <span>Actual Intake</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-0.5 bg-orange mr-1" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #F4C2A1 0, #F4C2A1 3px, transparent 3px, transparent 6px)' }}></div>
              <span>Daily Goal</span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowFoodSelection(true)}
            className="btn-3d p-4 text-white"
          >
            <div className="flex items-center justify-center">
              <Camera className="w-5 h-5 mr-2" />
              <span className="font-medium">Log Meal</span>
            </div>
          </button>

          <button
            onClick={() => setShowAddFood(true)}
            className="btn-3d btn-3d-mint p-4 text-gray-700"
          >
            <div className="flex items-center justify-center">
              <Plus className="w-5 h-5 mr-2" />
              <span className="font-medium">Add New Food</span>
            </div>
          </button>
        </div>

        {/* Today's Meals Timeline */}
        <div className="card-3d p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Today's Meals</h3>
            <button
              onClick={() => setShowMealHistory(true)}
              className="text-orange text-sm font-medium flex items-center"
            >
              View History <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          {todayMeals.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Utensils className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No meals logged today</p>
              <p className="text-sm">Tap "Log Meal" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayMeals.map((meal) => (
                <div key={meal.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg">{getMealTypeIcon(meal.mealType)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-800 capitalize">
                        {meal.mealType} - {format(meal.timestamp, 'HH:mm')}
                      </h4>
                      <span className="text-sm font-medium text-orange">
                        {meal.calories} cal
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        {meal.food.name} • {meal.amount} {meal.food.unit}
                      </p>
                      <span className="text-xs text-gray-500">
                        by {meal.loggedBy}
                      </span>
                    </div>
                  </div>
                  {meal.food.photo && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden shadow-3d flex-shrink-0">
                      <img
                        src={meal.food.photo}
                        alt={meal.food.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Photos Gallery */}
        {recentMealPhotos.length > 0 && (
          <div className="card-3d p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Recent Meal Photos</h3>
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {recentMealPhotos.map((meal) => (
                <div key={`photo-${meal.id}`} className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden shadow-3d">
                  <img
                    src={meal.food.photo || 'https://via.placeholder.com/64x64?text=Food'}
                    alt={meal.food.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Favorite Foods Quick Access */}
        <div className="card-3d p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Favorite Foods</h3>
          <div className="grid grid-cols-3 gap-2">
            {mockFoods
              .filter(food => food.isFavorite)
              .slice(0, 6)
              .map((food) => (
                <button
                  key={food.id}
                  onClick={() => setShowFoodSelection(true)}
                  className="card-3d p-3 text-center hover:shadow-3d-hover transition-all duration-200"
                >
                  <div className="w-12 h-12 mx-auto mb-2 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={food.photo || 'https://via.placeholder.com/48x48?text=Food'}
                      alt={food.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-center mb-1">
                    <Star className="w-3 h-3 text-yellow-500 mr-1" />
                    <span className="text-xs font-medium text-gray-800 truncate">
                      {food.name.split(' ')[0]}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600">
                    {food.caloriesPerUnit}/{food.unit}
                  </span>
                </button>
              ))}
          </div>
        </div>

        {/* Weekly Summary Card */}
        <div className="card-3d p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">This Week Summary</h3>
            <Calendar className="w-5 h-5 text-orange" />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {Math.round(sevenDayData.reduce((sum, day) => sum + day.calories, 0) / 7)}
              </p>
              <p className="text-xs text-gray-600">Avg Daily Calories</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {sevenDayData.filter(day => day.calories > 0).length}
              </p>
              <p className="text-xs text-gray-600">Days Logged</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {mockMealEntries
                  .filter(meal =>
                    meal.petId === selectedPet.id &&
                    new Date(meal.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
                  ).length}
              </p>
              <p className="text-xs text-gray-600">Total Meals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFoodSelection && (
        <FoodSelectionModal
          petId={selectedPet.id}
          onClose={() => setShowFoodSelection(false)}
        />
      )}

      {showAddFood && (
        <AddFoodModal
          onClose={() => setShowAddFood(false)}
        />
      )}

      {showMealHistory && (
        <MealHistoryModal
          petId={selectedPet.id}
          onClose={() => setShowMealHistory(false)}
        />
      )}
    </>
  );
};
