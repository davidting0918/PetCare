import React from 'react';
import {
  Target,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import {
  mockDailySummary,
  getTodayMeals,
  getTodayMedicineLogs,
  mockWeightEntries,
  mockActivities,
  mockMealEntries
} from '../../data/mockData';
import { format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { selectedPet } = useAuth();

  if (!selectedPet) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Please select a pet to view dashboard</p>
      </div>
    );
  }

  const todayMeals = getTodayMeals(selectedPet.id);
  const todayMedicineLogs = getTodayMedicineLogs(selectedPet.id);
  const summary = mockDailySummary;

  // Prepare weight chart data
  const weightChartData = mockWeightEntries
    .slice(-7)
    .map(entry => ({
      date: format(entry.date, 'MM/dd'),
      weight: entry.weight
    }));

  // Prepare calorie chart data (last 7 days)
  const calorieChartData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayMeals = mockMealEntries.filter(meal =>
      meal.petId === selectedPet.id &&
      meal.timestamp.toDateString() === date.toDateString()
    );
    const totalCalories = dayMeals.reduce((sum, meal) => sum + meal.calories, 0);

    calorieChartData.push({
      date: format(date, 'MM/dd'),
      calories: totalCalories,
      goal: selectedPet.dailyCalorieGoal
    });
  }

  const caloriesRemaining = selectedPet.dailyCalorieGoal - summary.caloriesConsumed;
  const weightProgress = selectedPet.targetWeight ?
    ((selectedPet.weight - selectedPet.targetWeight) / selectedPet.targetWeight * 100) : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Today's Calories */}
        <div className="card-3d p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-orange" />
            <span className="text-xs text-gray-500">Today</span>
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold text-gray-800">
              {summary.caloriesConsumed}
            </p>
            <p className="text-xs text-gray-600">
              of {selectedPet.dailyCalorieGoal} calories
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-orange h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((summary.caloriesConsumed / selectedPet.dailyCalorieGoal) * 100, 100)}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Current Weight */}
        <div className="card-3d p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-mint" />
            <span className="text-xs text-gray-500">Weight</span>
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold text-gray-800">
              {summary.weight?.toFixed(1)} kg
            </p>
            {selectedPet.targetWeight && (
              <>
                <p className="text-xs text-gray-600">
                  Goal: {selectedPet.targetWeight} kg
                </p>
                <p className={`text-xs font-medium ${
                  weightProgress > 0 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {weightProgress > 0 ? '+' : ''}{weightProgress.toFixed(1)}% from goal
                </p>
              </>
            )}
          </div>
        </div>

        {/* Meals Today */}
        <div className="card-3d p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-orange" />
            <span className="text-xs text-gray-500">Meals</span>
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold text-gray-800">
              {todayMeals.length}
            </p>
            <p className="text-xs text-gray-600">meals logged today</p>
          </div>
        </div>

        {/* Medicine Status */}
        <div className="card-3d p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-mint" />
            <span className="text-xs text-gray-500">Medicine</span>
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold text-gray-800">
              {todayMedicineLogs.filter(log => log.isGiven).length}/{todayMedicineLogs.length}
            </p>
            <p className="text-xs text-gray-600">given today</p>
          </div>
        </div>
      </div>

      {/* Calorie Progress */}
      <div className="card-3d p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Calories This Week</h3>
          <Target className="w-5 h-5 text-orange" />
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={calorieChartData}>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
              />
              <YAxis hide />
              <Bar
                dataKey="calories"
                fill="#F4C2A1"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
          <span>Daily Goal: {selectedPet.dailyCalorieGoal}</span>
          <span className={caloriesRemaining >= 0 ? 'text-green-600' : 'text-red-600'}>
            {caloriesRemaining >= 0 ? `${caloriesRemaining} left` : `${Math.abs(caloriesRemaining)} over`}
          </span>
        </div>
      </div>

      {/* Weight Progress Chart */}
      {mockWeightEntries.length > 0 && (
        <div className="card-3d p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Weight Trend</h3>
            <TrendingUp className="w-5 h-5 text-mint" />
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData}>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#B8E6D3"
                  strokeWidth={3}
                  dot={{ fill: '#B8E6D3', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#B8E6D3', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Today's Medicine */}
      {todayMedicineLogs.length > 0 && (
        <div className="card-3d p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Today's Medicine</h3>
            <Clock className="w-5 h-5 text-mint" />
          </div>
          <div className="space-y-2">
            {todayMedicineLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {log.isGiven ? (
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 mr-2" />
                  )}
                  <span className="text-sm font-medium text-gray-800">
                    {log.medicine.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {format(log.scheduledTime, 'HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card-3d p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Recent Activity</h3>
          <Activity className="w-5 h-5 text-orange" />
        </div>
        <div className="space-y-3">
          {mockActivities
            .filter(activity => activity.petId === selectedPet.id)
            .slice(0, 4)
            .map((activity) => (
              <div key={activity.id} className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-orange/20 flex items-center justify-center mr-3 flex-shrink-0">
                  <Activity className="w-4 h-4 text-orange" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {format(activity.timestamp, 'HH:mm')} • by {activity.performedBy}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-3d p-4 text-left group">
          <div className="flex items-center">
            <Plus className="w-5 h-5 text-white mr-3" />
            <div>
              <p className="text-white font-medium">Log Meal</p>
              <p className="text-white/80 text-xs">Quick food entry</p>
            </div>
          </div>
        </button>

        <button className="btn-3d btn-3d-mint p-4 text-left group">
          <div className="flex items-center">
            <Plus className="w-5 h-5 text-gray-700 mr-3" />
            <div>
              <p className="text-gray-700 font-medium">Record Weight</p>
              <p className="text-gray-600 text-xs">Update weight log</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
