import React, { useState } from 'react';
import {
  X,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  User,
  FileText,
  Camera,
  Filter
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts';
import { format, subDays, isWithinInterval } from 'date-fns';
import { getPetWeightEntries, mockPets, mockFamilyMembers } from '../../data/mockData';
import type { WeightEntry } from '../../types';

interface WeightHistoryModalProps {
  petId: string;
  onClose: () => void;
}

type ViewMode = 'timeline' | 'analytics' | 'trends';
type TimeRange = '30days' | '90days' | '6months' | '1year';

export const WeightHistoryModal: React.FC<WeightHistoryModalProps> = ({
  petId,
  onClose
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [timeRange, setTimeRange] = useState<TimeRange>('90days');
  const [selectedEntry, setSelectedEntry] = useState<WeightEntry | null>(null);

  const pet = mockPets.find(p => p.id === petId);
  const allEntries = getPetWeightEntries(petId);

  // Filter entries by time range
  const getFilteredEntries = (): WeightEntry[] => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '30days':
        startDate = subDays(now, 30);
        break;
      case '90days':
        startDate = subDays(now, 90);
        break;
      case '6months':
        startDate = subDays(now, 180);
        break;
      case '1year':
        startDate = subDays(now, 365);
        break;
      default:
        startDate = subDays(now, 90);
    }

    return allEntries.filter(entry => entry.date >= startDate);
  };

  const filteredEntries = getFilteredEntries();

  // Prepare chart data
  const chartData = filteredEntries.map(entry => ({
    date: format(entry.date, timeRange === '30days' ? 'MM/dd' : 'MMM dd'),
    weight: entry.weight,
    target: pet?.targetWeight || 0,
    fullDate: entry.date,
    entry
  }));

  // Calculate analytics
  const totalWeightChange = filteredEntries.length > 1
    ? filteredEntries[filteredEntries.length - 1].weight - filteredEntries[0].weight
    : 0;

  // Family member statistics
  const familyStats = filteredEntries.reduce((stats, entry) => {
    const member = mockFamilyMembers.find(f => f.id === entry.loggedBy)?.name || 'Unknown';
    if (!stats[member]) {
      stats[member] = 0;
    }
    stats[member] += 1;
    return stats;
  }, {} as Record<string, number>);

  const familyChartData = Object.entries(familyStats).map(([name, count]) => ({
    name,
    count,
    percentage: (count / filteredEntries.length) * 100
  }));

  // Weekly trend analysis
  const getWeeklyTrends = () => {
    const weeks = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const weekEnd = subDays(now, i * 7);
      const weekStart = subDays(weekEnd, 6);

      const weekEntries = filteredEntries.filter(entry =>
        isWithinInterval(entry.date, { start: weekStart, end: weekEnd })
      );

      if (weekEntries.length > 0) {
        const avgWeight = weekEntries.reduce((sum, e) => sum + e.weight, 0) / weekEntries.length;
        weeks.push({
          week: format(weekStart, 'MMM dd'),
          weight: avgWeight,
          entries: weekEntries.length
        });
      }
    }

    return weeks.reverse();
  };

  const weeklyData = getWeeklyTrends();

  const viewModes: { id: ViewMode; label: string; icon: any }[] = [
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'trends', label: 'Trends', icon: BarChart3 }
  ];

  const timeRanges: { id: TimeRange; label: string }[] = [
    { id: '30days', label: '30 Days' },
    { id: '90days', label: '90 Days' },
    { id: '6months', label: '6 Months' },
    { id: '1year', label: '1 Year' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-primary w-full max-w-md max-h-[90vh] rounded-3xl overflow-hidden shadow-3d flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 shadow-3d flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Weight History</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* View Mode Tabs */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-3">
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
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex space-x-1 overflow-x-auto">
              {timeRanges.map(range => (
                <button
                  key={range.id}
                  onClick={() => setTimeRange(range.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
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
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No weight entries in this time range</p>
                </div>
              ) : (
                filteredEntries.slice().reverse().map((entry, index) => {
                  const prevEntry = index < filteredEntries.length - 1 ? filteredEntries[filteredEntries.length - 2 - index] : null;
                  const weightChange = prevEntry ? entry.weight - prevEntry.weight : 0;
                  const familyMember = mockFamilyMembers.find(f => f.id === entry.loggedBy);

                  return (
                    <div
                      key={entry.id}
                      className="card-3d p-4 hover:shadow-3d-hover transition-all duration-200 cursor-pointer"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-800">
                              {entry.weight}kg
                            </h3>
                            {weightChange !== 0 && (
                              <div className="flex items-center text-sm">
                                {weightChange > 0 ? (
                                  <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                                )}
                                <span className={`font-medium ${
                                  weightChange > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}kg
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              {format(entry.date, 'EEEE, MMM dd, yyyy HH:mm')}
                            </div>
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2" />
                              {familyMember?.name || 'Unknown'}
                            </div>
                            {entry.notes && (
                              <div className="flex items-start">
                                <FileText className="w-4 h-4 mr-2 mt-0.5" />
                                <span className="text-gray-700">{entry.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {entry.photo && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden ml-3 flex-shrink-0">
                            <img
                              src={entry.photo}
                              alt="Progress"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Analytics View */}
          {viewMode === 'analytics' && (
            <div className="space-y-4">
              {/* Weight Trend Chart */}
              <div className="card-3d p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Weight Trend</h3>
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
                      {pet?.targetWeight && (
                        <ReferenceLine
                          y={pet.targetWeight}
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

              {/* Statistics Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card-3d p-3 text-center">
                  <p className="text-2xl font-bold text-gray-800">
                    {totalWeightChange > 0 ? '+' : ''}{totalWeightChange.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-600">Total Change (kg)</p>
                </div>
                <div className="card-3d p-3 text-center">
                  <p className="text-2xl font-bold text-gray-800">
                    {filteredEntries.length}
                  </p>
                  <p className="text-xs text-gray-600">Total Entries</p>
                </div>
                <div className="card-3d p-3 text-center">
                  <p className="text-2xl font-bold text-gray-800">
                    {filteredEntries.length > 0
                      ? (filteredEntries.reduce((sum, e) => sum + e.weight, 0) / filteredEntries.length).toFixed(1)
                      : '0'
                    }
                  </p>
                  <p className="text-xs text-gray-600">Avg Weight (kg)</p>
                </div>
              </div>

              {/* Family Tracking Stats */}
              <div className="card-3d p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Who Tracks Most?</h3>
                <div className="space-y-3">
                  {familyChartData.map((member, index) => (
                    <div key={member.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-800">{member.name}</span>
                        <span className="text-gray-600">
                          {member.count} entries ({member.percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            index === 0 ? 'bg-orange' :
                            index === 1 ? 'bg-mint' : 'bg-gray-400'
                          }`}
                          style={{ width: `${member.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Trends View */}
          {viewMode === 'trends' && (
            <div className="space-y-4">
              {/* Weekly Averages */}
              <div className="card-3d p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Weekly Averages</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <XAxis
                        dataKey="week"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#6B7280' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: '#6B7280' }}
                      />
                      <Bar
                        dataKey="weight"
                        fill="#B8E6D3"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tracking Consistency */}
              <div className="card-3d p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Tracking Consistency</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Entries this month</span>
                    <span className="font-semibold text-gray-800">
                      {filteredEntries.filter(e =>
                        e.date >= subDays(new Date(), 30)
                      ).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average per week</span>
                    <span className="font-semibold text-gray-800">
                      {(filteredEntries.length / Math.max(1, Math.ceil(filteredEntries.length * 7 / 30))).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Longest streak</span>
                    <span className="font-semibold text-gray-800">
                      7 days
                    </span>
                  </div>
                </div>
              </div>

              {/* Pattern Insights */}
              <div className="card-3d p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Pattern Insights</h3>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <p className="text-blue-800 font-medium">💡 Most weigh-ins happen in the morning</p>
                    <p className="text-blue-600 text-xs">Consider setting a morning reminder</p>
                  </div>
                  {totalWeightChange < 0 && (
                    <div className="p-2 bg-green-50 rounded-lg border-l-4 border-green-400">
                      <p className="text-green-800 font-medium">✅ Consistent weight loss progress</p>
                      <p className="text-green-600 text-xs">Keep up the great work!</p>
                    </div>
                  )}
                  <div className="p-2 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                    <p className="text-yellow-800 font-medium">📊 Most entries by Mom</p>
                    <p className="text-yellow-600 text-xs">Consider involving other family members</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-60">
          <div className="bg-white rounded-xl p-6 m-4 max-w-sm w-full shadow-3d">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Weight Entry</h3>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-earth">{selectedEntry.weight}kg</p>
                <p className="text-sm text-gray-600">
                  {format(selectedEntry.date, 'EEEE, MMM dd, yyyy')}
                </p>
                <p className="text-sm text-gray-600">
                  {format(selectedEntry.date, 'HH:mm')}
                </p>
              </div>

              <div className="text-sm text-gray-600">
                <div className="flex items-center mb-2">
                  <User className="w-4 h-4 mr-2" />
                  Recorded by: {mockFamilyMembers.find(f => f.id === selectedEntry.loggedBy)?.name || 'Unknown'}
                </div>

                {selectedEntry.notes && (
                  <div className="flex items-start mb-2">
                    <FileText className="w-4 h-4 mr-2 mt-0.5" />
                    <span>{selectedEntry.notes}</span>
                  </div>
                )}

                {selectedEntry.photo && (
                  <div className="mt-3">
                    <div className="flex items-center mb-2">
                      <Camera className="w-4 h-4 mr-2" />
                      Progress Photo
                    </div>
                    <img
                      src={selectedEntry.photo}
                      alt="Progress"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
