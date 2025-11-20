import React, { useState, useMemo, useEffect } from 'react';
import { Scale, TrendingUp, Calendar, Plus, Loader2, User, Edit2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { LineChart } from '@mui/x-charts/LineChart';
import { usePet, useWeight } from '../../hooks';
import { CreateWeightForm, UpdateWeightForm } from '../forms';
import { formatLocalDate, utcToLocal } from '../../utils/dateUtils';
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

// Format datetime for display (using UTC to local conversion)
const formatDateTime = (dateString: string): string => {
  return formatLocalDate(dateString, 'MMM d, h:mm a');
};

export const WeightPage: React.FC = () => {
  const { selectedPet } = usePet();
  const {
    getCachedWeightRecords,
    isLoadingWeightRecords,
    getWeightError,
    getWeightRecords,
    refreshWeightRecords,
  } = useWeight();
  const [selectedInterval, setSelectedInterval] = useState<TimeIntervalType>('last_30_days');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUpdateFormOpen, setIsUpdateFormOpen] = useState(false);
  const [selectedWeightRecord, setSelectedWeightRecord] = useState<WeightRecord | null>(null);

  // Custom date range state
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { startDate: start, endDate: end };
  });
  const [customDateError, setCustomDateError] = useState<string>('');

  // Get weight records from cache
  const weightRecords = selectedPet ? getCachedWeightRecords(selectedPet.id) : [];
  const isLoadingRecords = selectedPet ? isLoadingWeightRecords(selectedPet.id) : false;
  const recordsError = selectedPet ? getWeightError(selectedPet.id) : null;

  // Fetch weight records when pet is selected
  useEffect(() => {
    if (!selectedPet) return;

    // Only fetch if we don't have cached records
    const cachedRecords = getCachedWeightRecords(selectedPet.id);
    if (cachedRecords.length === 0 && !isLoadingWeightRecords(selectedPet.id)) {
      console.log('📊 WeightPage: Fetching weight records for pet:', selectedPet.id);
      getWeightRecords(selectedPet.id, { number: 10 }).catch((error) => {
      console.error('❌ WeightPage: Error loading weight records:', error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPet?.id]);

  // Filter records based on selected interval
  const filteredRecords = useMemo(() => {
    // Only use custom date range if it's valid
    const customRange = selectedInterval === 'custom' && !customDateError
      ? customDateRange
      : undefined;

    const { start, end } = getDateRange(selectedInterval, customRange);
    return weightRecords.filter(record => {
      const recordDate = utcToLocal(record.timestamp);
      return recordDate >= start && recordDate <= end;
    });
  }, [selectedInterval, customDateRange, customDateError, weightRecords]);

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
      const dateKey = utcToLocal(record.timestamp).toLocaleDateString('en-CA');
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

  // Prepare data for MUI X LineChart
  const chartDataForMUI = useMemo(() => {
    return chartData.map(point => ({
      date: point.date.getTime(), // Convert to timestamp for xAxis
      weight: point.weight
    }));
  }, [chartData]);

  // Format date for xAxis
  const formatDateForAxis = (value: number) => {
    const date = new Date(value);
    return formatDate(date);
  };

  const handleFormSuccess = async (message: string) => {
    console.log('✅ Weight recorded:', message);
    setIsFormOpen(false);
    // Refresh weight records after successful creation
    if (selectedPet) {
      await refreshWeightRecords(selectedPet.id, { number: 10 });
    }
  };

  const handleUpdateClick = (record: WeightRecord) => {
    setSelectedWeightRecord(record);
    setIsUpdateFormOpen(true);
  };

  const handleUpdateSuccess = async (message: string) => {
    console.log('✅ Weight updated:', message);
    setIsUpdateFormOpen(false);
    setSelectedWeightRecord(null);
    // Refresh weight records after successful update
    if (selectedPet) {
      await refreshWeightRecords(selectedPet.id, { number: 10 });
    }
  };

  const handleUpdateClose = () => {
    setIsUpdateFormOpen(false);
    setSelectedWeightRecord(null);
  };

  const handleRefresh = async () => {
    if (selectedPet) {
      await refreshWeightRecords(selectedPet.id, { number: 10 });
    }
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
    <div className="p-4 space-y-4 lg:p-6">
      {/* Weight Trend Chart - Priority at top, full width */}
      <div className="card-3d p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-mint/20 flex items-center justify-center mr-3">
              <TrendingUp className="w-5 h-5 text-mint" />
            </div>
            <h3 className="text-lg font-semibold text-earth">Weight Trend</h3>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoadingRecords}
            className="p-2 text-gray-600 hover:text-mint hover:bg-mint/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh weight records"
          >
            <RefreshCw className={`w-5 h-5 ${isLoadingRecords ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Time Interval Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-earth mb-2">
            Time Interval
          </label>
          <select
            value={selectedInterval}
            onChange={(e) => setSelectedInterval(e.target.value as TimeIntervalType)}
            className="w-full px-3 py-2 border-2 border-mint/30 bg-white rounded-lg focus:ring-2 focus:ring-mint focus:border-mint hover:border-mint/50 transition-colors text-earth font-medium"
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
                  <label className="block text-sm font-medium text-earth mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(customDateRange.startDate)}
                    onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                    max={formatDateForInput(customDateRange.endDate)}
                    className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint hover:border-mint/50 transition-colors text-earth ${
                      customDateError ? 'border-red-300' : 'border-mint/30'
                    }`}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-earth mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(customDateRange.endDate)}
                    onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                    min={formatDateForInput(customDateRange.startDate)}
                    max={formatDateForInput(new Date())}
                    className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint hover:border-mint/50 transition-colors text-earth ${
                      customDateError ? 'border-red-300' : 'border-mint/30'
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
                <div className="bg-mint/5 rounded-lg p-2 border border-mint/20">
                  <p className="text-sm text-earth text-center">
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
            <div className="w-full" style={{ height: '256px' }}>
              <LineChart
                xAxis={[{
                  data: chartDataForMUI.map(d => d.date),
                  valueFormatter: (value) => formatDateForAxis(value),
                  scaleType: 'time',
                  label: 'Date',
                  labelStyle: {
                    fontSize: 12,
                    fill: '#6b7280'
                  },
                  tickLabelStyle: {
                    fontSize: 11,
                    fill: '#6b7280'
                  }
                }]}
                yAxis={[{
                  label: 'Weight (kg)',
                  labelStyle: {
                    fontSize: 12,
                    fill: '#6b7280'
                  },
                  tickLabelStyle: {
                    fontSize: 11,
                    fill: '#6b7280'
                  },
                  valueFormatter: (value: number) => `${value.toFixed(2)} kg`,
                  min: weightRange.min,
                  max: weightRange.max
                }]}
                series={[{
                  data: chartDataForMUI.map(d => d.weight),
                  color: '#B8E6D3',
                  showMark: chartDataForMUI.length <= 20 ? true : ({ index }) => {
                    // Show marks for first, last, and evenly distributed points
                    const step = Math.max(1, Math.floor(chartDataForMUI.length / 10));
                    return index % step === 0 || index === chartDataForMUI.length - 1;
                  },
                  curve: 'monotoneX',
                  label: 'Weight'
                }]}
                height={256}
                grid={{ vertical: true, horizontal: true }}
                slotProps={{
                  tooltip: {
                    sx: {
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }
                  }
                }}
                sx={{
                  '& .MuiLineElement-root': {
                    strokeWidth: 3,
                    stroke: '#B8E6D3'
                  },
                  '& .MuiMarkElement-root': {
                    fill: '#B8E6D3',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    r: 4
                  },
                  '& .MuiChartsGrid-root line': {
                    stroke: '#e5e7eb',
                    strokeWidth: 1
                  },
                  '& .MuiChartsAxis-root line': {
                    stroke: '#d1d5db',
                    strokeWidth: 1
                  },
                  '& .MuiChartsAxis-root text': {
                    fill: '#6b7280',
                    fontSize: 11
                  }
                }}
              />
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
            </div>
          </div>
        )}
      </div>

      {/* Weight Records Card - Add button at top, history below */}
      <div className="card-3d p-5">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-mint/20 flex items-center justify-center mr-3">
            <Scale className="w-5 h-5 text-mint" />
          </div>
          <h3 className="text-lg font-semibold text-earth">Weight Records</h3>
        </div>

        {/* Add New Weight Button */}
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-full btn-3d btn-3d-mint py-3 px-4 text-white flex items-center justify-center gap-2 mb-4"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Add New Weight</span>
        </button>

        {/* Weight Records History */}
        {isLoadingRecords ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-mint animate-spin" />
            <span className="ml-3 text-gray-600">Loading records...</span>
          </div>
        ) : recordsError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{recordsError}</p>
            <button
              onClick={() => selectedPet && refreshWeightRecords(selectedPet.id, { number: 10 })}
              className="mt-2 text-sm text-red-700 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        ) : weightRecords.length > 0 ? (
          <div className="space-y-2">
            {weightRecords.map((record, index) => (
              <div
                key={record.id}
                className={`rounded-lg p-4 border transition-colors ${
                  index === 0
                    ? 'bg-mint/5 border-mint/20'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {index === 0 && (
                      <span className="text-xs font-medium text-mint mr-2 px-2 py-0.5 bg-mint/20 rounded">
                        Latest
                      </span>
                    )}
                    <span className="text-2xl font-bold text-earth">
                      {record.weight.toFixed(1)} kg
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{formatDateTime(record.timestamp)}</span>
                    </div>
                    <button
                      onClick={() => handleUpdateClick(record)}
                      className="p-2 text-gray-600 hover:text-mint hover:bg-mint/10 rounded-lg transition-colors"
                      title="Edit weight record"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {record.user_name && (
                  <div className="flex items-center text-sm text-gray-600 mt-2">
                    <User className="w-4 h-4 mr-1" />
                    <span>{record.user_name}</span>
                  </div>
                )}
                {record.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{record.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-200">
            <div className="text-center text-gray-400">
              <Scale className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No weight records yet</p>
              <p className="text-xs mt-1">Click "Add New Weight" to start tracking</p>
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

      {/* Update Weight Form Modal */}
      <UpdateWeightForm
        isOpen={isUpdateFormOpen}
        onClose={handleUpdateClose}
        onSuccess={handleUpdateSuccess}
        weightRecord={selectedWeightRecord}
      />
    </div>
  );
};
