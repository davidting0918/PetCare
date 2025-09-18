import React, { useState } from 'react';
import {
  X,
  Filter,
  TrendingUp,
  BarChart3,
  Clock,
  User,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays, isWithinInterval } from 'date-fns';
import { mockMealEntries, mockFamilyMembers } from '../../data/mockData';
import type { MealEntry } from '../../types';

interface MealHistoryModalProps {
  petId: string;
  onClose: () => void;
}

type ViewMode = 'timeline' | 'analytics' | 'patterns';
type TimeRange = '7days' | '30days' | '90days' | 'custom';

export const MealHistoryModal: React.FC<MealHistoryModalProps> = ({
  petId,
  onClose
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Filter meals by pet and time range
  const getFilteredMeals = (): MealEntry[] => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7days':
        startDate = subDays(now, 7);
        break;
      case '30days':
        startDate = subDays(now, 30);
        break;
      case '90days':
        startDate = subDays(now, 90);
        break;
      default:
        startDate = subDays(now, 30);
    }

    return mockMealEntries.filter(meal =>
      meal.petId === petId &&
      isWithinInterval(meal.timestamp, { start: startDate, end: now })
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const filteredMeals = getFilteredMeals();

  // Group meals by date
  const groupedMeals = filteredMeals.reduce((groups, meal) => {
    const dateKey = format(meal.timestamp, 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(meal);
    return groups;
  }, {} as Record<string, MealEntry[]>);

  // Prepare analytics data
  const caloriesByDay = Object.entries(groupedMeals).map(([date, meals]) => ({
    date: format(new Date(date), 'MM/dd'),
    calories: meals.reduce((sum, meal) => sum + meal.calories, 0),
    meals: meals.length
  })).reverse();

  // Food breakdown data
  const foodBreakdown = filteredMeals.reduce((breakdown, meal) => {
    const existing = breakdown.find(item => item.name === meal.food.name);
    if (existing) {
      existing.calories += meal.calories;
      existing.count += 1;
    } else {
      breakdown.push({
        name: meal.food.name,
        calories: meal.calories,
        count: 1
      });
    }
    return breakdown;
  }, [] as { name: string; calories: number; count: number }[])
  .sort((a, b) => b.calories - a.calories)
  .slice(0, 5);

  const COLORS = ['#F4C2A1', '#B8E6D3', '#8D7053', '#F2EAD3', '#E5E7EB'];

  // Family member feeding stats
  const familyStats = filteredMeals.reduce((stats, meal) => {
    const member = mockFamilyMembers.find(f => f.id === meal.loggedBy)?.name || 'Unknown';
    if (!stats[member]) {
      stats[member] = 0;
    }
    stats[member] += 1;
    return stats;
  }, {} as Record<string, number>);

  const familyData = Object.entries(familyStats).map(([name, count]) => ({
    name,
    count
  }));

  const toggleDay = (dateKey: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedDays(newExpanded);
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

  const viewModes: { id: ViewMode; label: string; icon: any }[] = [
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'patterns', label: 'Patterns', icon: BarChart3 }
  ];

  const timeRanges: { id: TimeRange; label: string }[] = [
    { id: '7days', label: '7 Days' },
    { id: '30days', label: '30 Days' },
    { id: '90days', label: '90 Days' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-primary w-full max-w-md h-[90vh] rounded-t-3xl overflow-hidden shadow-3d">
        {/* Header */}
        <div className="bg-white p-4 shadow-3d">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Meal History</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* View Mode Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {viewModes.map(mode => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    viewMode === mode.id
                      ? 'bg-white text-orange shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {mode.label}
                </button>
              );
            })}
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center space-x-2 mt-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex space-x-1">
              {timeRanges.map(range => (
                <button
                  key={range.id}
                  onClick={() => setTimeRange(range.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    timeRange === range.id
                      ? 'bg-orange text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Timeline View */}
          {viewMode === 'timeline' && (
            <div className="space-y-3">
              {Object.entries(groupedMeals).map(([dateKey, meals]) => {
                const date = new Date(dateKey);
                const isExpanded = expandedDays.has(dateKey);
                const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);

                return (
                  <div key={dateKey} className="card-3d overflow-hidden">
                    <button
                      onClick={() => toggleDay(dateKey)}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {format(date, 'EEEE, MMM dd')}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {meals.length} meals • {totalCalories} calories
                          </p>
                        </div>
                        <div className="flex items-center">
                          <div className="text-right mr-2">
                            <div className="text-sm font-medium text-orange">
                              {totalCalories} cal
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 p-4 pt-0">
                        <div className="space-y-3 mt-3">
                          {meals.map(meal => (
                            <div key={meal.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                              <div className="text-lg">{getMealTypeIcon(meal.mealType)}</div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-medium text-gray-800 capitalize text-sm">
                                    {meal.mealType} - {format(meal.timestamp, 'HH:mm')}
                                  </h4>
                                  <span className="text-sm font-medium text-orange">
                                    {meal.calories} cal
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-600">
                                    {meal.food.name} • {meal.amount} {meal.food.unit}
                                  </p>
                                  <span className="text-xs text-gray-500 flex items-center">
                                    <User className="w-3 h-3 mr-1" />
                                    {mockFamilyMembers.find(f => f.id === meal.loggedBy)?.name || 'Unknown'}
                                  </span>
                                </div>
                              </div>
                              {meal.food.photo && (
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Analytics View */}
          {viewMode === 'analytics' && (
            <div className="space-y-4">
              {/* Calorie Trend Chart */}
              <div className="card-3d p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Daily Calorie Intake</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={caloriesByDay}>
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
                      <Line
                        type="monotone"
                        dataKey="calories"
                        stroke="#B8E6D3"
                        strokeWidth={3}
                        dot={{ fill: '#B8E6D3', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#B8E6D3', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Food Breakdown */}
              <div className="card-3d p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Top Foods</h3>
                <div className="space-y-2">
                  {foodBreakdown.map((food, index) => (
                    <div key={food.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {food.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-orange">{food.calories} cal</p>
                        <p className="text-xs text-gray-500">{food.count} times</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card-3d p-3 text-center">
                  <p className="text-lg font-bold text-gray-800">
                    {Math.round(filteredMeals.reduce((sum, meal) => sum + meal.calories, 0) / caloriesByDay.length)}
                  </p>
                  <p className="text-xs text-gray-600">Avg Daily Cal</p>
                </div>
                <div className="card-3d p-3 text-center">
                  <p className="text-lg font-bold text-gray-800">{filteredMeals.length}</p>
                  <p className="text-xs text-gray-600">Total Meals</p>
                </div>
                <div className="card-3d p-3 text-center">
                  <p className="text-lg font-bold text-gray-800">
                    {new Set(filteredMeals.map(m => m.food.name)).size}
                  </p>
                  <p className="text-xs text-gray-600">Unique Foods</p>
                </div>
              </div>
            </div>
          )}

          {/* Patterns View */}
          {viewMode === 'patterns' && (
            <div className="space-y-4">
              {/* Family Feeding Stats */}
              <div className="card-3d p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Who Feeds Most?</h3>
                <div className="space-y-2">
                  {familyData.map((member, index) => {
                    const percentage = (member.count / filteredMeals.length) * 100;
                    return (
                      <div key={member.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-800">{member.name}</span>
                          <span className="text-gray-600">{member.count} meals ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Meal Type Distribution */}
              <div className="card-3d p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Meal Type Distribution</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Breakfast', value: filteredMeals.filter(m => m.mealType === 'breakfast').length },
                          { name: 'Lunch', value: filteredMeals.filter(m => m.mealType === 'lunch').length },
                          { name: 'Dinner', value: filteredMeals.filter(m => m.mealType === 'dinner').length },
                          { name: 'Snacks', value: filteredMeals.filter(m => m.mealType === 'snack').length }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Average Meal Times */}
              <div className="card-3d p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Typical Feeding Times</h3>
                <div className="space-y-2">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => {
                    const mealTimes = filteredMeals
                      .filter(meal => meal.mealType === mealType)
                      .map(meal => meal.timestamp.getHours() + meal.timestamp.getMinutes() / 60);

                    if (mealTimes.length === 0) return null;

                    const avgTime = mealTimes.reduce((sum, time) => sum + time, 0) / mealTimes.length;
                    const hours = Math.floor(avgTime);
                    const minutes = Math.round((avgTime - hours) * 60);

                    return (
                      <div key={mealType} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <span className="mr-2">{getMealTypeIcon(mealType)}</span>
                          <span className="font-medium text-gray-800 capitalize">{mealType}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          ~{hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
