import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Calendar, User, Edit2, Apple, UtensilsCrossed, MoreVertical } from 'lucide-react';
import { BarChart } from '@mui/x-charts/BarChart';
import { ChartsReferenceLine } from '@mui/x-charts/ChartsReferenceLine';
import { format } from 'date-fns';
import { usePet, useMeal, useFood } from '../../hooks';
import { CreateMealForm, UpdateMealForm, CreateFoodForm, FoodDetailsModal } from '../forms';
import { mealService } from '../../api';
import { formatLocalDate, utcToLocal } from '../../utils/dateUtils';
import type { MealInfo, MealDetails } from '../../types';
import { getChartPalette } from '../../constants/colors';
import { MEAL_TYPES, getMealTypeChartColor } from '../../constants/mealTypes';
import type { DateRange } from '../../types';

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

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { startDate: start, endDate: end };
  });
  const [dateError, setDateError] = useState<string>('');
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

  // Snapshot the chart palette once on mount. The palette is read from CSS
  // variables, so it stays in sync with token changes between renders without
  // recomputing on every render.
  const chartPalette = useMemo(() => getChartPalette(), []);

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
    const start = new Date(dateRange.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.endDate);
    end.setHours(23, 59, 59, 999);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    type ChartPoint = {
      date: string;
      breakfast: number;
      lunch: number;
      dinner: number;
      snack: number;
      unclassified: number;
    };
    const dataPoints: ChartPoint[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

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
  }, [meals, dateRange]);

  // Responsive chart height — tracks container width via ResizeObserver
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(250);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      setChartHeight(Math.max(200, Math.min(380, Math.round(width * 0.5))));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Chart summary stats (period average + highest day)
  const chartSummary = useMemo(() => {
    if (chartData.length === 0) return null;
    const dailyTotals = chartData.map(d => d.breakfast + d.lunch + d.dinner + d.snack + d.unclassified);
    const daysWithData = dailyTotals.filter(v => v > 0).length;
    const total = dailyTotals.reduce((sum, v) => sum + v, 0);
    return {
      average: daysWithData > 0 ? Math.round(total / daysWithData) : 0,
      highest: Math.round(Math.max(...dailyTotals)),
    };
  }, [chartData]);

  const dailyCalorieTarget = selectedPet?.daily_calorie_target;

  const handleMealSuccess = async (message: string) => {
    console.log('✅', message);
    if (petId) {
      await refreshMealRecords(petId, {
        date_from: dateRange.startDate.toISOString().split('T')[0],
        limit: 100
      });
      await getTodayMeals(petId);
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    if (!value) return;
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    const newRange = { ...dateRange, [field]: date };
    setDateRange(newRange);
    if (newRange.endDate < newRange.startDate) {
      setDateError('End date must be after start date');
    } else {
      setDateError('');
    }
  };

  const formatDateForInput = (date: Date): string => format(date, 'yyyy-MM-dd');

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
        <div className="surface-card p-6 text-center">
          <p className="text-text-secondary">Please select a pet to view meal records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 lg:p-6">

      {/* Today's Summary Card */}
      {todaySummary && (
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-text-primary">Today's Summary</h3>
            <Calendar className="w-5 h-5 text-accent-pink" />
          </div>
          <div className="space-y-3">
            {/* Calorie Progress */}
            {todaySummary.daily_calorie_target && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">Calories</span>
                  <span className="font-semibold text-text-primary">
                    {Math.round(todaySummary.total_calories)} / {todaySummary.daily_calorie_target} kcal
                  </span>
                </div>
                <div className="w-full bg-surface-2 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-accent-pink h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min((todaySummary.calorie_target_percentage || 0), 100)}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  {todaySummary.calorie_target_percentage?.toFixed(0)}% of daily target
                </p>
              </div>
            )}

            {/* Meal Counts */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border-subtle">
              <div className="text-center">
                <p className="text-xs text-text-tertiary font-medium">Breakfast</p>
                <p className="text-lg font-bold text-text-primary">{todaySummary.breakfast_count}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary font-medium">Lunch</p>
                <p className="text-lg font-bold text-text-primary">{todaySummary.lunch_count}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary font-medium">Dinner</p>
                <p className="text-lg font-bold text-text-primary">{todaySummary.dinner_count}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary font-medium">Snack</p>
                <p className="text-lg font-bold text-text-primary">{todaySummary.snack_count}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calorie Chart */}
      <div className="surface-card p-5">
        <h3 className="text-lg font-semibold text-text-primary mb-3">Daily Calories</h3>

        {/* Date Range Selector */}
        <div className="mb-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Start Date</label>
              <input
                type="date"
                value={formatDateForInput(dateRange.startDate)}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                max={formatDateForInput(dateRange.endDate)}
                className={`input-field text-sm ${dateError ? 'border-danger' : ''}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">End Date</label>
              <input
                type="date"
                value={formatDateForInput(dateRange.endDate)}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                min={formatDateForInput(dateRange.startDate)}
                max={formatDateForInput(new Date())}
                className={`input-field text-sm ${dateError ? 'border-danger' : ''}`}
              />
            </div>
          </div>
          {dateError && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-2 mt-2">
              <p className="text-danger text-sm">{dateError}</p>
            </div>
          )}
        </div>

        {/* Summary subtitle */}
        {chartSummary && (
          <p className="text-xs text-text-tertiary mb-4">
            Avg {chartSummary.average} kcal/day · Peak {chartSummary.highest} kcal
            {dailyCalorieTarget ? ` · Target ${dailyCalorieTarget} kcal` : ''}
          </p>
        )}

        {chartData.length > 0 ? (
          <div ref={chartContainerRef} className="w-full">
            <BarChart
              xAxis={[{
                data: chartData.map(d => d.date),
                scaleType: 'band',
                categoryGapRatio: 0.35,
                tickLabelStyle: { fill: chartPalette.textSecondary, fontSize: 11 },
              }]}
              yAxis={[{
                tickLabelStyle: { fill: chartPalette.textSecondary, fontSize: 11 },
              }]}
              series={[
                {
                  data: chartData.map(d => d.breakfast),
                  stack: 'total',
                  label: MEAL_TYPES.breakfast.label,
                  color: getMealTypeChartColor('breakfast', chartPalette),
                  valueFormatter: (v: number | null) => v ? `${Math.round(v)} kcal` : '0 kcal',
                },
                {
                  data: chartData.map(d => d.lunch),
                  stack: 'total',
                  label: MEAL_TYPES.lunch.label,
                  color: getMealTypeChartColor('lunch', chartPalette),
                  valueFormatter: (v: number | null) => v ? `${Math.round(v)} kcal` : '0 kcal',
                },
                {
                  data: chartData.map(d => d.dinner),
                  stack: 'total',
                  label: MEAL_TYPES.dinner.label,
                  color: getMealTypeChartColor('dinner', chartPalette),
                  valueFormatter: (v: number | null) => v ? `${Math.round(v)} kcal` : '0 kcal',
                },
                {
                  data: chartData.map(d => d.snack),
                  stack: 'total',
                  label: MEAL_TYPES.snack.label,
                  color: getMealTypeChartColor('snack', chartPalette),
                  valueFormatter: (v: number | null) => v ? `${Math.round(v)} kcal` : '0 kcal',
                },
                {
                  data: chartData.map(d => d.unclassified),
                  stack: 'total',
                  label: MEAL_TYPES.unclassified.label,
                  color: getMealTypeChartColor('unclassified', chartPalette),
                  valueFormatter: (v: number | null) => v ? `${Math.round(v)} kcal` : '0 kcal',
                },
              ]}
              height={chartHeight}
              borderRadius={4}
              grid={{ horizontal: true }}
              margin={{ top: 20, right: 16, bottom: 24, left: 40 }}
              slotProps={{
                tooltip: {
                  sx: {
                    '& .MuiChartsTooltip-paper, & .MuiChartsTooltip-table': {
                      backgroundColor: chartPalette.surface3,
                      border: `1px solid ${chartPalette.borderDefault}`,
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    },
                    '& .MuiChartsTooltip-cell': {
                      color: chartPalette.textPrimary,
                      borderBottomColor: chartPalette.borderSubtle,
                      fontSize: '12px',
                    },
                    '& .MuiChartsTooltip-valueCell': {
                      color: chartPalette.textSecondary,
                      fontWeight: 600,
                    },
                    '& .MuiChartsTooltip-mark': {
                      borderRadius: '3px',
                    },
                  },
                },
              }}
              sx={{
                // Catch-all: every SVG text element uses theme color
                '& text': {
                  fill: `${chartPalette.textSecondary} !important`,
                },
                '& .MuiChartsGrid-root line': {
                  stroke: chartPalette.borderSubtle,
                  strokeWidth: 0.5,
                  strokeOpacity: 0.6,
                },
                '& .MuiChartsAxis-root .MuiChartsAxis-line': {
                  stroke: 'transparent',
                },
                '& .MuiChartsAxis-root .MuiChartsAxis-tick': {
                  stroke: 'transparent',
                },
                // Legend in v8 is HTML (li > span), not SVG — needs `color`
                '& .MuiChartsLegend-root, & .MuiChartsLegend-root *': {
                  color: `${chartPalette.textSecondary} !important`,
                  fontSize: '11px !important',
                },
                // ChartsLabel is the <span> inside each legend item
                '& .MuiChartsLabel-root': {
                  color: `${chartPalette.textSecondary} !important`,
                },
              }}
            >
              {dailyCalorieTarget != null && (
                <ChartsReferenceLine
                  y={dailyCalorieTarget}
                  lineStyle={{
                    stroke: chartPalette.warning,
                    strokeDasharray: '6 4',
                    strokeWidth: 1.5,
                    strokeOpacity: 0.7,
                  }}
                  labelStyle={{
                    fill: chartPalette.textTertiary,
                    fontSize: 10,
                  }}
                  label="Target"
                />
              )}
            </BarChart>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-3 bg-surface-2 rounded-2xl flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-text-disabled" />
            </div>
            <p className="text-sm text-text-tertiary">No meal data for selected period</p>
            <p className="text-xs text-text-disabled mt-1">Log a meal to see your daily calorie chart</p>
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Meal History */}
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <UtensilsCrossed className="w-5 h-5 text-accent-pink mr-2" />
              <h3 className="text-lg font-semibold text-text-primary">Recent Meals</h3>
            </div>
            <button
              onClick={() => setIsCreateMealOpen(true)}
              className="btn-primary px-3 py-2 flex items-center gap-2"
              title="Log a meal"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Log Meal</span>
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-pink mx-auto"></div>
            </div>
          ) : error ? (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-4">
              <p className="text-danger text-sm">{error}</p>
            </div>
          ) : meals.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {meals.slice(0, 20).map((meal) => {
                const config = meal.meal_type ? MEAL_TYPES[meal.meal_type] : MEAL_TYPES.unclassified;
                return (
                  <div
                    key={meal.id}
                    className={`rounded-xl p-4 border transition-colors ${config.bgClass} ${config.borderClass}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-medium uppercase tracking-wide ${config.textClass}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-text-tertiary">
                            {formatLocalDate(meal.timestamp)}
                          </span>
                        </div>
                        <p className="font-semibold text-text-primary mb-1">{meal.food_name}</p>
                        <div className="flex items-center gap-3 text-sm text-text-secondary">
                          <span>{meal.serving_amount} {meal.serving_type}</span>
                          <span>•</span>
                          <span>{Math.round(meal.calories)} kcal</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-text-tertiary mt-1">
                          <User className="w-3 h-3" />
                          <span>{meal.fed_by_name}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEditMeal(meal)}
                        className="p-2 text-text-tertiary hover:text-accent-pink hover:bg-surface-3 rounded-lg transition-colors"
                        title="Edit meal"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-text-tertiary">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No meals recorded yet</p>
              <button
                onClick={() => setIsCreateMealOpen(true)}
                className="mt-4 text-accent-pink hover:underline text-sm"
              >
                Log your first meal
              </button>
            </div>
          )}
        </div>

        {/* Right: Food Database */}
        <div className="surface-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Apple className="w-5 h-5 text-accent-blue mr-2" />
              <h3 className="text-lg font-semibold text-text-primary">Food Database</h3>
            </div>
            <button
              onClick={() => setIsCreateFoodOpen(true)}
              className="btn-primary px-3 py-2 text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Food</span>
            </button>
          </div>

          {foods.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
              {foods.map((food) => (
                <div
                  key={food.id}
                  className="bg-surface-2 rounded-xl p-3 border border-border-subtle cursor-pointer hover:border-border-default hover:bg-surface-3 transition-colors relative"
                >
                  {/* Three-dot menu button */}
                  <div className="absolute top-2 right-2 z-10 food-menu-container">
                    <button
                      onClick={(e) => handleFoodMenuClick(e, food.id)}
                      className="p-1 rounded-full text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
                      aria-label="Food options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {/* Dropdown menu */}
                    {menuOpenFoodId === food.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-surface-3 rounded-xl shadow-elevated border border-border-default py-1 z-20">
                        <button
                          onClick={() => handleMenuAction('view', food.id)}
                          className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-surface-2 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleMenuAction('edit', food.id)}
                          className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-surface-2 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleMenuAction('delete', food.id)}
                          className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <div onClick={() => handleFoodClick(food.id)}>
                    <div className="aspect-video bg-surface-3 rounded-lg mb-2 overflow-hidden">
                      {food.photo_url ? (
                        <img
                          src={food.photo_url}
                          alt={food.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Apple className="w-12 h-12 text-text-tertiary" />
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-text-primary text-sm truncate">{food.brand}</p>
                    <p className="text-xs text-text-secondary truncate">{food.product_name}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle">
                      <span className="text-xs text-text-tertiary">
                        {food.food_type === 'wet_food' ? 'Wet' : 'Dry'} · {food.target_pet}
                      </span>
                      <span className="text-xs font-semibold text-accent-blue">
                        {food.calories} kcal/100g
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-text-tertiary">
              <Apple className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No foods in database yet</p>
              <button
                onClick={() => setIsCreateFoodOpen(true)}
                className="mt-4 text-accent-blue hover:underline text-sm"
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
