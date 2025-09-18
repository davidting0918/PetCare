import React, { useState } from 'react';
import {
  Scale,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  User,
  Settings,
  Download,
  Bell
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';
import { format, subDays } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import {
  getPetWeightEntries,
  getLatestWeightEntry,
  calculateWeightProgress,
  getWeeklyWeightAverage,
  getWeightTrend,
  mockFamilyMembers
} from '../../data/mockData';
import { WeightEntryModal } from './WeightEntryModal';
import { GoalSettingModal } from './GoalSettingModal';
import { WeightHistoryModal } from './WeightHistoryModal';
import { CircularProgress } from './CircularProgress';

// Custom Tooltip Component for Weight Chart
const WeightChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const weight = payload[0].value;
    const data = payload[0].payload;

    return (
      <div className="bg-white p-3 rounded-lg shadow-3d border border-gray-200 text-sm">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Weight:</span>
            <span className="font-medium text-mint">{weight} kg</span>
          </div>
          {data.target && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Target:</span>
              <span className="font-medium text-orange">{data.target} kg</span>
            </div>
          )}
          {data.change && (
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <span className="text-gray-600">Change:</span>
              <span className={`font-medium ${data.change > 0 ? 'text-green-600' : data.change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {data.change > 0 ? '+' : ''}{data.change} kg
              </span>
            </div>
          )}
          {data.notes && (
            <div className="pt-1 border-t border-gray-100">
              <span className="text-gray-600 text-xs">{data.notes}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const WeightPage: React.FC = () => {
  const { selectedPet } = useAuth();
  const [showWeightEntry, setShowWeightEntry] = useState(false);
  const [showGoalSetting, setShowGoalSetting] = useState(false);
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [timeRange, setTimeRange] = useState<'30days' | '90days' | '6months'>('30days');

  if (!selectedPet) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Please select a pet to track weight</p>
      </div>
    );
  }

  const weightEntries = getPetWeightEntries(selectedPet.id);
  const latestWeight = getLatestWeightEntry(selectedPet.id);
  const weightProgress = calculateWeightProgress(selectedPet.id);
  const thisWeekAvg = getWeeklyWeightAverage(selectedPet.id, 0);
  const lastWeekAvg = getWeeklyWeightAverage(selectedPet.id, 1);
  const weightTrend = getWeightTrend(selectedPet.id);

  // Prepare chart data based on selected time range
  const getChartData = () => {
    const days = timeRange === '30days' ? 30 : timeRange === '90days' ? 90 : 180;
    const startDate = subDays(new Date(), days);

    const filteredEntries = weightEntries.filter(entry => entry.date >= startDate);

    return filteredEntries.map(entry => ({
      date: format(entry.date, timeRange === '30days' ? 'MM/dd' : 'MMM dd'),
      weight: entry.weight,
      target: selectedPet.targetWeight || 0,
      fullDate: entry.date
    }));
  };

  const chartData = getChartData();

  const getTrendIcon = () => {
    switch (weightTrend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendText = () => {
    const weekDifference = thisWeekAvg - lastWeekAvg;
    const absChange = Math.abs(weekDifference);

    if (weightTrend === 'up') {
      return `+${absChange.toFixed(1)}kg this week`;
    } else if (weightTrend === 'down') {
      return `-${absChange.toFixed(1)}kg this week`;
    } else {
      return 'Stable weight';
    }
  };

  const getTrendColor = () => {
    switch (weightTrend) {
      case 'up':
        return 'text-red-600 bg-red-100';
      case 'down':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const timeToGoal = () => {
    if (!selectedPet.targetWeight || !latestWeight) return null;

    const weightToLose = latestWeight.weight - selectedPet.targetWeight;
    if (weightToLose <= 0) return 'Goal achieved! 🎉';

    // Calculate average weekly loss from last 4 weeks
    const recentEntries = weightEntries.slice(-8);
    if (recentEntries.length < 4) return 'Need more data';

    const oldWeight = recentEntries[0].weight;
    const newWeight = recentEntries[recentEntries.length - 1].weight;
    const weeksSpan = 4;
    const weeklyLoss = (oldWeight - newWeight) / weeksSpan;

    if (weeklyLoss <= 0) return 'Maintaining current weight';

    const weeksToGoal = Math.ceil(weightToLose / weeklyLoss);
    return `~${weeksToGoal} weeks to goal`;
  };

  return (
    <>
      <div className="p-4 space-y-4 pb-6">
        {/* Current Weight Card */}
        <div className="card-3d weight-card-glow p-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Scale className="w-6 h-6 text-mint mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">Current Weight</h2>
            </div>

            <div className="text-4xl font-bold text-earth mb-2">
              {latestWeight ? `${latestWeight.weight} kg` : 'No data'}
            </div>

            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 mb-3">
              <div className="flex items-center">
                {getTrendIcon()}
                <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor()}`}>
                  {getTrendText()}
                </span>
              </div>
            </div>

            {latestWeight && (
              <div className="space-y-1 text-sm text-gray-500">
                <div className="flex items-center justify-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Last updated: {format(latestWeight.date, 'MMM dd, HH:mm')}
                </div>
                <div className="flex items-center justify-center">
                  <User className="w-4 h-4 mr-1" />
                  Recorded by: {mockFamilyMembers.find(f => f.id === latestWeight.loggedBy)?.name || 'Unknown'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Goal Progress Ring */}
        {selectedPet.targetWeight && (
          <div className="card-3d p-6">
            <div className="text-center">
              <h3 className="font-semibold text-gray-800 mb-4">Goal Progress</h3>
              <div className="flex items-center justify-center">
                <CircularProgress
                  percentage={weightProgress}
                  size={120}
                  strokeWidth={8}
                />
              </div>
              <div className="mt-4 space-y-1">
                <div className="text-2xl font-bold text-orange">{Math.round(weightProgress)}%</div>
                <div className="text-sm text-gray-600">
                  Current: {latestWeight?.weight}kg • Target: {selectedPet.targetWeight}kg
                </div>
                <div className="text-sm text-gray-600">
                  To go: {latestWeight ? `${(latestWeight.weight - selectedPet.targetWeight).toFixed(1)}kg` : '-'}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {timeToGoal()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Weight Trend Chart */}
        <div className="card-3d p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Weight Trend</h3>
            <div className="flex space-x-1">
              {(['30days', '90days', '6months'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-orange text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range === '30days' ? '30D' : range === '90days' ? '90D' : '6M'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                />
                <YAxis
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                />
                <Tooltip content={<WeightChartTooltip />} cursor={{ stroke: '#B8E6D3', strokeWidth: 2 }} />
                {selectedPet.targetWeight && (
                  <ReferenceLine
                    y={selectedPet.targetWeight}
                    stroke="#F4C2A1"
                    strokeDasharray="5 5"
                    label="Target"
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#B8E6D3"
                  strokeWidth={3}
                  dot={{ fill: '#8D7053', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#B8E6D3', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowWeightEntry(true)}
            className="btn-3d p-4 text-white"
          >
            <div className="flex items-center justify-center">
              <Scale className="w-5 h-5 mr-2" />
              <span className="font-medium">Log Weight</span>
            </div>
          </button>

          <button
            onClick={() => setShowGoalSetting(true)}
            className="btn-3d btn-3d-mint p-4 text-gray-700"
          >
            <div className="flex items-center justify-center">
              <Target className="w-5 h-5 mr-2" />
              <span className="font-medium">Set Goal</span>
            </div>
          </button>
        </div>

        {/* Weekly Summary */}
        <div className="card-3d p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Weekly Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-xl font-bold text-gray-800">{thisWeekAvg.toFixed(1)}kg</p>
              <p className="text-xs text-gray-500">average</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Last Week</p>
              <p className="text-xl font-bold text-gray-800">{lastWeekAvg.toFixed(1)}kg</p>
              <p className="text-xs text-gray-500">average</p>
            </div>
          </div>
          <div className="mt-3 p-2 bg-gray-50 rounded-lg text-center">
            <div className="flex items-center justify-center">
              {weightTrend === 'down' && selectedPet.targetWeight && latestWeight && latestWeight.weight > selectedPet.targetWeight ? (
                <span className="text-green-600 font-medium text-sm">✅ On track to goal</span>
              ) : weightTrend === 'up' ? (
                <span className="text-red-600 font-medium text-sm">⚠️ Weight increasing</span>
              ) : (
                <span className="text-gray-600 font-medium text-sm">📊 Weight stable</span>
              )}
            </div>
          </div>
        </div>

        {/* Recent Entries */}
        <div className="card-3d p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Recent Entries</h3>
            <button
              onClick={() => setShowWeightHistory(true)}
              className="text-orange text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {weightEntries.slice(-5).reverse().map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{entry.weight}kg</p>
                  <p className="text-xs text-gray-500">
                    {format(entry.date, 'MMM dd, HH:mm')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-xs text-gray-500">
                    <User className="w-3 h-3 mr-1" />
                    {mockFamilyMembers.find(f => f.id === entry.loggedBy)?.name || 'Unknown'}
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-gray-400 mt-1 max-w-20 truncate">
                      {entry.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="grid grid-cols-3 gap-2">
          <button className="btn-3d btn-3d-mint p-3 text-gray-700 text-sm">
            <Settings className="w-4 h-4 mx-auto mb-1" />
            Settings
          </button>
          <button className="btn-3d btn-3d-mint p-3 text-gray-700 text-sm">
            <Bell className="w-4 h-4 mx-auto mb-1" />
            Reminders
          </button>
          <button className="btn-3d btn-3d-mint p-3 text-gray-700 text-sm">
            <Download className="w-4 h-4 mx-auto mb-1" />
            Export
          </button>
        </div>

        {/* Milestone Progress */}
        {selectedPet.targetWeight && latestWeight && (
          <div className="card-3d p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Milestone Progress</h3>
            <div className="space-y-3">
              {[
                { label: '25% to goal', value: 25 },
                { label: '50% to goal', value: 50 },
                { label: '75% to goal', value: 75 },
                { label: 'Goal achieved!', value: 100 }
              ].map((milestone) => (
                <div key={milestone.value} className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    weightProgress >= milestone.value
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {weightProgress >= milestone.value ? '✓' : milestone.value}
                  </div>
                  <span className={`text-sm ${
                    weightProgress >= milestone.value
                      ? 'text-green-600 font-medium'
                      : 'text-gray-500'
                  }`}>
                    {milestone.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showWeightEntry && (
        <WeightEntryModal
          petId={selectedPet.id}
          onClose={() => setShowWeightEntry(false)}
        />
      )}

      {showGoalSetting && (
        <GoalSettingModal
          petId={selectedPet.id}
          onClose={() => setShowGoalSetting(false)}
        />
      )}

      {showWeightHistory && (
        <WeightHistoryModal
          petId={selectedPet.id}
          onClose={() => setShowWeightHistory(false)}
        />
      )}
    </>
  );
};
