import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Calendar, User, Edit2, Apple, UtensilsCrossed, MoreVertical } from 'lucide-react';
import { BarChart } from '@mui/x-charts/BarChart';
import { format } from 'date-fns';
import { usePet, useMeal, useFood } from '../../hooks';
import { CreateMealForm, UpdateMealForm, CreateFoodForm, FoodDetailsModal } from '../forms';
import { mealService } from '../../api';
import { formatLocalDate, utcToLocal } from '../../utils/dateUtils';
import type { MealInfo, MealDetails } from '../../types';
import { COLORS } from '../../constants/colors';
import { MEAL_TYPES } from '../../constants/mealTypes';

type TimeRange = 'last_3_days' | 'last_7_days' | 'last_14_days';

// Legacy support - map to new MEAL_TYPES config
const MEAL_TYPE_COLORS = {
  breakfast: MEAL_TYPES.breakfast.bgColor,
  lunch: MEAL_TYPES.lunch.bgColor,
  dinner: MEAL_TYPES.dinner.bgColor,
  snack: MEAL_TYPES.snack.bgColor
};

export const MealPage: React.FC = () => {
  const { selectedPet } = usePet();
  const {
    getCachedMealRecords,
    getCachedTodaySummary,
    shouldFetchTodaySummary,
    isLoadingMealRecords,
    getMealError,
    getMealRecords,
    getTodayMeals,
    refreshMealRecords
  } = useMeal();
  const {
    getCachedGroupFoods,
    shouldFetchGroupFoods,
    getGroupFoods,
    deleteFood: deleteFoodAction
  } = useFood();

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('last_7_days');
  const [isCreateMealOpen, setIsCreateMealOpen] = useState(false);
  const [isUpdateMealOpen, setIsUpdateMealOpen] = useState(false);
  const [selectedMealForEdit, setSelectedMealForEdit] = useState<MealDetails | null>(null);
  const [isCreateFoodOpen, setIsCreateFoodOpen] = useState(false);
  const [isFoodDetailsOpen, setIsFoodDetailsOpen] = useState(false);
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [preSelectedFoodId, setPreSelectedFoodId] = useState<string | null>(null);
  const [menuOpenFoodId, setMenuOpenFoodId] = useState<string | null>(null);
  const [initialEditMode, setInitialEditMode] = useState(false);

  const petId = selectedPet?.id;
  const groupId = selectedPet?.group_id;

  // Memoize cached collections so referential identity is stable across renders.
  // This is required because they feed dependency arrays of useMemo / useEffect
  // below; without memoization those hooks would re-run every render.
  const meals = useMemo(
    () => (petId ? getCachedMealRecords(petId) : []),
    [petId, getCachedMealRecords]
  );
  const todaySummary = petId ? getCachedTodaySummary(petId) : null;
  const foods = groupId ? getCachedGroupFoods(groupId) : [];
  const isLoading = petId ? isLoadingMealRecords(petId) : false;
  const error = petId ? getMealError(petId) : null;

  // Load data when pet is selected
  useEffect(() => {
    if (!petId || !groupId) return;

    // Only fetch if we don't have cached records
    const hasCachedMeals = getCachedMealRecords(petId).length > 0;
    if (!hasCachedMeals && !isLoadingMealRecords(petId)) {
      console.log('📊 MealPage: Fetching meal records for pet:', petId);
      // Use last 14 days as default for initial fetch
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 14);

      getMealRecords(petId, {
        date_from: dateFrom.toISOString().split('T')[0],
        limit: 100
      }).catch(err => console.error('❌ MealPage: Failed to load meals:', err));
    }

    // Load today's summary only if no cache and not loading
    if (shouldFetchTodaySummary(petId)) {
      getTodayMeals(petId).catch(err => console.error('❌ MealPage: Failed to load today summary:', err));
    }

    // Load foods only if no cache and not loading
    if (shouldFetchGroupFoods(groupId)) {
      getGroupFoods(groupId).catch(err => console.error('❌ MealPage: Failed to load foods:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId, groupId]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const days = selectedTimeRange === 'last_3_days' ? 3 : selectedTimeRange === 'last_7_days' ? 7 : 14;
    const today = new Date();
    type ChartPoint = {
      date: string;
      breakfast: number;
      lunch: number;
      dinner: number;
      snack: number;
      unclassified: number;
    };
    const dataPoints: ChartPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Filter meals by local date (convert UTC timestamp to local date)
      const dayMeals = meals.filter(m => {
        const localDate = utcToLocal(m.timestamp);
        const localDateStr = localDate.toISOString().split('T')[0];
        return localDateStr === dateStr;
      });

      const breakfast = dayMeals.filter(m => m.meal_type === 'breakfast').reduce((sum, m) => sum + m.calories, 0);
      const lunch = dayMeals.filter(m => m.meal_type === 'lunch').reduce((sum, m) => sum + m.calories, 0);
      const dinner = dayMeals.filter(m => m.meal_type === 'dinner').reduce((sum, m) => sum + m.calories, 0);
      const snack = dayMeals.filter(m => m.meal_type === 'snack').reduce((sum, m) => sum + m.calories, 0);
      const unclassified = dayMeals.filter(m => !m.meal_type).reduce((sum, m) => sum + m.calories, 0);

      dataPoints.push({
        date: format(date, 'M/d'),
        breakfast,
        lunch,
        dinner,
        snack,
        unclassified
      });
    }

    return dataPoints;
  }, [meals, selectedTimeRange]);

  const handleMealSuccess = async (message: string) => {
    console.log('✅', message);
    if (petId) {
      const days = selectedTimeRange === 'last_3_days' ? 3 : selectedTimeRange === 'last_7_days' ? 7 : 14;
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      await refreshMealRecords(petId, {
        date_from: dateFrom.toISOString().split('T')[0],
        limit: 100
      });
      await getTodayMeals(petId);
    }
  };

  const handleFoodSuccess = async (message: string) => {
    console.log('✅', message);
    if (groupId) {
      await getGroupFoods(groupId);
    }
  };

  const handleEditMeal = async (meal: MealInfo) => {
    try {
      const response = await mealService.getMealDetails(meal.id);
      if (response.status === 1 && response.data) {
        setSelectedMealForEdit(response.data);
        setIsUpdateMealOpen(true);
      }
    } catch (error) {
      console.error('Failed to load meal details:', error);
    }
  };

  const handleFoodClick = (foodId: string) => {
    setSelectedFoodId(foodId);
    setIsFoodDetailsOpen(true);
  };

  const handleUseInMeal = (foodId: string) => {
    setPreSelectedFoodId(foodId);
    setIsCreateMealOpen(true);
  };

  const handleDeleteFood = async (foodId: string) => {
    if (!groupId) return;
    try {
      await deleteFoodAction(foodId, groupId);
      await getGroupFoods(groupId);
      setMenuOpenFoodId(null);
    } catch (error) {
      console.error('Failed to delete food:', error);
    }
  };

  const handleFoodMenuClick = (e: React.MouseEvent, foodId: string) => {
    e.stopPropagation();
    setMenuOpenFoodId(menuOpenFoodId === foodId ? null : foodId);
  };

  const handleMenuAction = (action: 'view' | 'edit' | 'delete', foodId: string) => {
    setMenuOpenFoodId(null);
    if (action === 'view') {
      setSelectedFoodId(foodId);
      setInitialEditMode(false);
      setIsFoodDetailsOpen(true);
    } else if (action === 'edit') {
      setSelectedFoodId(foodId);
      setInitialEditMode(true);
      setIsFoodDetailsOpen(true);
    } else if (action === 'delete') {
      handleDeleteFood(foodId);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.food-menu-container')) {
        setMenuOpenFoodId(null);
      }
    };

    if (menuOpenFoodId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [menuOpenFoodId]);

  if (!selectedPet) {
    return (
      <div className="p-4">
        <div className="card-3d p-6 text-center">
          <p className="text-gray-600">Please select a pet to view meal records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 lg:p-6">

      {/* Today's Summary Card */}
      {todaySummary && (
        <div className="card-3d p-5 bg-gradient-to-br from-mint/10 to-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-earth">Today's Summary</h3>
            <Calendar className="w-5 h-5 text-mint" />
          </div>
          <div className="space-y-3">
            {/* Calorie Progress */}
            {todaySummary.daily_calorie_target && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Calories</span>
                  <span className="font-semibold text-earth">
                    {Math.round(todaySummary.total_calories)} / {todaySummary.daily_calorie_target} kcal
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-mint h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min((todaySummary.calorie_target_percentage || 0), 100)}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {todaySummary.calorie_target_percentage?.toFixed(0)}% of daily target
                </p>
              </div>
            )}

            {/* Meal Counts */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t">
              <div className="text-center">
                <p className="text-xs text-gray-600 font-medium">Breakfast</p>
                <p className="text-lg font-bold text-earth">{todaySummary.breakfast_count}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 font-medium">Lunch</p>
                <p className="text-lg font-bold text-earth">{todaySummary.lunch_count}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 font-medium">Dinner</p>
                <p className="text-lg font-bold text-earth">{todaySummary.dinner_count}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 font-medium">Snack</p>
                <p className="text-lg font-bold text-earth">{todaySummary.snack_count}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calorie Chart */}
      <div className="card-3d p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-earth">Daily Calories</h3>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as TimeRange)}
            className="px-3 py-1 border-2 border-mint/30 rounded-lg text-sm focus:ring-2 focus:ring-mint focus:border-mint"
          >
            <option value="last_3_days">Last 3 Days</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_14_days">Last 14 Days</option>
          </select>
        </div>

        {chartData.length > 0 ? (
          <div className="w-full" style={{ height: '300px' }}>
            <BarChart
              xAxis={[{
                data: chartData.map(d => d.date),
                scaleType: 'band',
                categoryGapRatio: 0.3
              }]}
              yAxis={[{
                label: 'Calories (kcal)'
              }]}
              series={[
                {
                  data: chartData.map(d => d.breakfast),
                  stack: 'total',
                  label: 'Breakfast',
                  color: MEAL_TYPES.breakfast.chartColor
                },
                {
                  data: chartData.map(d => d.lunch),
                  stack: 'total',
                  label: 'Lunch',
                  color: MEAL_TYPES.lunch.chartColor
                },
                {
                  data: chartData.map(d => d.dinner),
                  stack: 'total',
                  label: 'Dinner',
                  color: MEAL_TYPES.dinner.chartColor
                },
                {
                  data: chartData.map(d => d.snack),
                  stack: 'total',
                  label: 'Snack',
                  color: MEAL_TYPES.snack.chartColor
                },
                {
                  data: chartData.map(d => d.unclassified),
                  stack: 'total',
                  label: 'Other',
                  color: MEAL_TYPES.unclassified.chartColor
                }
              ]}
              height={300}
            />
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No meal data for selected period</p>
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Meal History */}
        <div className="card-3d p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <UtensilsCrossed className="w-5 h-5 text-mint mr-2" />
              <h3 className="text-lg font-semibold text-earth">Recent Meals</h3>
            </div>
            <button
              onClick={() => setIsCreateMealOpen(true)}
              className="btn-3d btn-3d-mint px-3 py-2 text-white flex items-center gap-2"
              title="Log a meal"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Log Meal</span>
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint mx-auto"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          ) : meals.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {meals.slice(0, 20).map((meal) => (
                <div
                  key={meal.id}
                  className="rounded-lg p-4 border-2 border-gray-200 hover:border-mint/50 transition-colors"
                  style={{
                    backgroundColor: meal.meal_type ? MEAL_TYPE_COLORS[meal.meal_type] : COLORS.mealTypes.unclassified
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-600">
                          {formatLocalDate(meal.timestamp)}
                        </span>
                      </div>
                      <p className="font-semibold text-earth mb-1">{meal.food_name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>{meal.serving_amount} {meal.serving_type}</span>
                        <span>•</span>
                        <span>{Math.round(meal.calories)} kcal</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <User className="w-3 h-3" />
                        <span>{meal.fed_by_name}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEditMeal(meal)}
                      className="p-2 text-gray-600 hover:text-mint hover:bg-white/50 rounded-lg transition-colors"
                      title="Edit meal"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No meals recorded yet</p>
              <button
                onClick={() => setIsCreateMealOpen(true)}
                className="mt-4 text-mint hover:underline text-sm"
              >
                Log your first meal
              </button>
            </div>
          )}
        </div>

        {/* Right: Food Database */}
        <div className="card-3d p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Apple className="w-5 h-5 text-orange mr-2" />
              <h3 className="text-lg font-semibold text-earth">Food Database</h3>
            </div>
            <button
              onClick={() => setIsCreateFoodOpen(true)}
              className="btn-3d px-3 py-1 text-sm text-white"
              style={{ backgroundColor: COLORS.orange }}
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Add Food
            </button>
          </div>

          {foods.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
              {foods.map((food) => (
                <div
                  key={food.id}
                  className="card-3d p-3 cursor-pointer hover:shadow-lg transition-shadow relative"
                >
                  {/* Three-dot menu button */}
                  <div className="absolute top-2 right-2 z-10 food-menu-container">
                    <button
                      onClick={(e) => handleFoodMenuClick(e, food.id)}
                      className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                      aria-label="Food options"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>
                    {/* Dropdown menu */}
                    {menuOpenFoodId === food.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          onClick={() => handleMenuAction('view', food.id)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleMenuAction('edit', food.id)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleMenuAction('delete', food.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <div onClick={() => handleFoodClick(food.id)}>
                    <div className="aspect-video bg-gray-100 rounded-lg mb-2 overflow-hidden">
                      {food.photo_url ? (
                        <img
                          src={food.photo_url}
                          alt={food.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Apple className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-earth text-sm truncate">{food.brand}</p>
                    <p className="text-xs text-gray-600 truncate">{food.product_name}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-xs text-gray-500">
                        {food.food_type === 'wet_food' ? 'Wet' : 'Dry'} · {food.target_pet}
                      </span>
                      <span className="text-xs font-semibold text-orange">
                        {food.calories} kcal/100g
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Apple className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No foods in database yet</p>
              <button
                onClick={() => setIsCreateFoodOpen(true)}
                className="mt-4 text-orange hover:underline text-sm"
              >
                Add your first food
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateMealForm
        isOpen={isCreateMealOpen}
        onClose={() => {
          setIsCreateMealOpen(false);
          setPreSelectedFoodId(null);
        }}
        onSuccess={handleMealSuccess}
        preSelectedFoodId={preSelectedFoodId || undefined}
      />

      <UpdateMealForm
        isOpen={isUpdateMealOpen}
        onClose={() => {
          setIsUpdateMealOpen(false);
          setSelectedMealForEdit(null);
        }}
        onSuccess={handleMealSuccess}
        mealDetails={selectedMealForEdit}
      />

      <CreateFoodForm
        isOpen={isCreateFoodOpen}
        onClose={() => setIsCreateFoodOpen(false)}
        onSuccess={handleFoodSuccess}
        groupId={groupId || ''}
      />

      <FoodDetailsModal
        isOpen={isFoodDetailsOpen}
        onClose={() => {
          setIsFoodDetailsOpen(false);
          setSelectedFoodId(null);
          setInitialEditMode(false);
        }}
        foodId={selectedFoodId}
        onUseInMeal={handleUseInMeal}
        onDelete={handleDeleteFood}
        initialEditMode={initialEditMode}
        onSuccess={handleFoodSuccess}
      />
    </div>
  );
};
