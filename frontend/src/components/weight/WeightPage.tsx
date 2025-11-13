import React, { useState, useMemo, useEffect } from 'react';
import { Scale, TrendingUp, Calendar, User, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { usePet } from '../../hooks';
import { CreateWeightForm } from '../forms';
import type { WeightRecord, TimeIntervalType, CustomDateRange } from '../../types';

// Calculate date range based on interval type
const getDateRange = (
  intervalType: TimeIntervalType,
  customRange?: CustomDateRange
): { start: Date; end: Date } => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();

  switch (intervalType) {
    case 'last_7_days':
      start.setDate(start.getDate() - 7);
      break;
    case 'last_30_days':
      start.setDate(start.getDate() - 30);
      break;
    case 'last_90_days':
      start.setDate(start.getDate() - 90);
      break;
    case 'this_week':
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case 'this_month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      if (customRange) {
        start.setTime(customRange.startDate.getTime());
        end.setTime(customRange.endDate.getTime());
        end.setHours(23, 59, 59, 999);
      } else {
        // Default to last 30 days if custom range not set
        start.setDate(start.getDate() - 30);
      }
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  start.setHours(0, 0, 0, 0);
  return { start, end };
};

// Format date for display
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
};

// Format datetime for display
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const WeightPage: React.FC = () => {
  const { selectedPet } = usePet();
  const [selectedInterval, setSelectedInterval] = useState<TimeIntervalType>('last_30_days');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Custom date range state
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { startDate: start, endDate: end };
  });
  const [customDateError, setCustomDateError] = useState<string>('');

  // TODO: Replace with API call to fetch weight records
  // const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  // useEffect(() => { fetchWeightRecords(); }, [selectedPet]);
  const weightRecords: WeightRecord[] = [];

  // Filter records based on selected interval
  const filteredRecords = useMemo(() => {
    // Only use custom date range if it's valid
    const customRange = selectedInterval === 'custom' && !customDateError
      ? customDateRange
      : undefined;

    const { start, end } = getDateRange(selectedInterval, customRange);
    return weightRecords.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate >= start && recordDate <= end;
    });
  }, [selectedInterval, customDateRange, customDateError, weightRecords]);

  // Get latest record for display
  const latestRecord = useMemo(() => {
    return weightRecords.length > 0 ? weightRecords[0] : null;
  }, [weightRecords]);

  // Calculate chart data points
  const chartData = useMemo(() => {
    // Only use custom date range if it's valid
    const customRange = selectedInterval === 'custom' && !customDateError
      ? customDateRange
      : undefined;

    const { start, end } = getDateRange(selectedInterval, customRange);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Group records by day
    const dailyData: { [key: string]: WeightRecord[] } = {};
    filteredRecords.forEach(record => {
      const dateKey = new Date(record.timestamp).toLocaleDateString('en-CA');
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = [];
      }
      dailyData[dateKey].push(record);
    });

    // Create data points for chart
    const points: { date: Date; weight: number }[] = [];
    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateKey = date.toLocaleDateString('en-CA');

      if (dailyData[dateKey] && dailyData[dateKey].length > 0) {
        // Use average weight if multiple records in one day
        const avgWeight = dailyData[dateKey].reduce((sum, r) => sum + r.weight, 0) / dailyData[dateKey].length;
        points.push({ date: new Date(date), weight: avgWeight });
      }
    }

    return points;
  }, [filteredRecords, selectedInterval]);

  // Calculate min/max weight for chart scaling
  const weightRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 20 };
    const weights = chartData.map(p => p.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const padding = (max - min) * 0.1 || 1;
    return { min: Math.max(0, min - padding), max: max + padding };
  }, [chartData]);

  const handleFormSuccess = (message: string) => {
    console.log('✅ Weight recorded:', message);
    setIsFormOpen(false);
    // TODO: Refresh weight records when API is implemented
  };

  // Handle custom date range changes
  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    if (!value) return; // Don't process empty values

    const date = new Date(value);
    date.setHours(0, 0, 0, 0);

    // Update the date range first
    const newRange = { ...customDateRange, [field]: date };
    setCustomDateRange(newRange);

    // Then validate
    if (newRange.endDate < newRange.startDate) {
      setCustomDateError('End date must be after start date');
    } else {
      setCustomDateError('');
    }
  };

  // Reset custom date range when switching away from custom
  useEffect(() => {
    if (selectedInterval !== 'custom') {
      setCustomDateError('');
    }
  }, [selectedInterval]);

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  if (!selectedPet) {
    return (
      <div className="p-4">
        <div className="card-3d p-6 text-center">
          <p className="text-gray-600">Please select a pet to view weight records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Record Weight Button */}
      <div className="card-3d p-4">
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-full btn-3d btn-3d-mint p-4 text-white flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Record Current Weight</span>
        </button>
      </div>

      {/* Latest Weight Record Card */}
      <div className="card-3d p-5">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-mint/20 flex items-center justify-center mr-3">
            <Scale className="w-5 h-5 text-mint" />
          </div>
          <h3 className="text-lg font-semibold text-earth">Latest Weight Record</h3>
        </div>

        {latestRecord ? (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Weight</span>
                <span className="text-2xl font-bold text-earth">{latestRecord.weight.toFixed(2)} kg</span>
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{formatDateTime(latestRecord.timestamp)}</span>
              </div>
              {latestRecord.user_name && (
                <div className="flex items-center text-sm text-gray-500 mt-2">
                  <User className="w-4 h-4 mr-2" />
                  <span>Recorded by {latestRecord.user_name}</span>
                </div>
              )}
              {latestRecord.notes && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600">{latestRecord.notes}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-200">
            <div className="text-center text-gray-400">
              <Scale className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No weight records yet</p>
              <p className="text-xs mt-1">Click above to record your pet's weight</p>
            </div>
          </div>
        )}
      </div>

      {/* Weight Chart Section */}
      <div className="card-3d p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-mint/20 flex items-center justify-center mr-3">
              <TrendingUp className="w-5 h-5 text-mint" />
            </div>
            <h3 className="text-lg font-semibold text-earth">Weight Trend</h3>
          </div>
        </div>

        {/* Time Interval Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time Interval
          </label>
          <select
            value={selectedInterval}
            onChange={(e) => setSelectedInterval(e.target.value as TimeIntervalType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint/50 focus:border-mint"
          >
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="last_90_days">Last 90 Days</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="custom">Custom Date Range</option>
          </select>
          {selectedInterval === 'custom' && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(customDateRange.startDate)}
                    onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                    max={formatDateForInput(customDateRange.endDate)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint/50 focus:border-mint ${
                      customDateError ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(customDateRange.endDate)}
                    onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                    min={formatDateForInput(customDateRange.startDate)}
                    max={formatDateForInput(new Date())}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-mint/50 focus:border-mint ${
                      customDateError ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>

              {/* Error Message */}
              {customDateError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                  <p className="text-red-600 text-sm">{customDateError}</p>
                </div>
              )}

              {/* Date Range Display */}
              {!customDateError && (
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-sm text-gray-600 text-center">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {format(customDateRange.startDate, 'MMM d, yyyy')} - {format(customDateRange.endDate, 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chart Area */}
        {chartData.length > 0 ? (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="relative h-64">
              {/* Simple Line Chart Visualization */}
              <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map(i => (
                  <line
                    key={`grid-${i}`}
                    x1="0"
                    y1={(i * 200) / 4}
                    x2="800"
                    y2={(i * 200) / 4}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                ))}

                {/* Weight line */}
                {chartData.length > 1 && (
                  <polyline
                    points={chartData.map((point, index) => {
                      const x = (index / (chartData.length - 1)) * 800;
                      const y = 200 - ((point.weight - weightRange.min) / (weightRange.max - weightRange.min)) * 200;
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#B8E6D3"
                    strokeWidth="3"
                  />
                )}

                {/* Data points */}
                {chartData.map((point, index) => {
                  const x = chartData.length > 1
                    ? (index / (chartData.length - 1)) * 800
                    : 400; // Center point if only one data point
                  const y = 200 - ((point.weight - weightRange.min) / (weightRange.max - weightRange.min)) * 200;
                  return (
                    <circle
                      key={`point-${index}`}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#B8E6D3"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  );
                })}
              </svg>

              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
                <span>{weightRange.max.toFixed(2)} kg</span>
                <span>{((weightRange.min + weightRange.max) / 2).toFixed(2)} kg</span>
                <span>{weightRange.min.toFixed(2)} kg</span>
              </div>

              {/* X-axis labels */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 pt-2 px-4">
                {chartData.length > 0 && (
                  <>
                    <span>{formatDate(chartData[0].date)}</span>
                    {chartData.length > 1 && (
                      <span>{formatDate(chartData[chartData.length - 1].date)}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Chart Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Records</p>
                <p className="text-lg font-semibold text-earth">{filteredRecords.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Avg Weight</p>
                <p className="text-lg font-semibold text-earth">
                  {filteredRecords.length > 0
                    ? (filteredRecords.reduce((sum, r) => sum + r.weight, 0) / filteredRecords.length).toFixed(2)
                    : '-'}{' '}
                  kg
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Change</p>
                <p className="text-lg font-semibold text-earth">
                  {chartData.length >= 2
                    ? `${(chartData[chartData.length - 1].weight - chartData[0].weight).toFixed(2)} kg`
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-200">
            <div className="text-center text-gray-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No weight records for selected period</p>
              <p className="text-xs mt-1">Record weight to see trends</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Weight Form Modal */}
      <CreateWeightForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};
