import React, { useState, useMemo, useEffect } from 'react';
import { Scale, TrendingUp, Calendar, Plus, Loader2, User, Edit2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { LineChart } from '@mui/x-charts/LineChart';
import { usePet, useWeight } from '../../hooks';
import { CreateWeightForm, UpdateWeightForm } from '../forms';
import { formatLocalDate, utcToLocal, formatDateShort } from '../../utils/dateUtils';
import type { WeightRecord, DateRange } from '../../types';
import { getChartPalette } from '../../constants/colors';

export const WeightPage: React.FC = () => {
  const { selectedPet } = usePet();
  const {
    getCachedWeightRecords,
    isLoadingWeightRecords,
    getWeightError,
    getWeightRecords,
    refreshWeightRecords,
  } = useWeight();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUpdateFormOpen, setIsUpdateFormOpen] = useState(false);
  const [selectedWeightRecord, setSelectedWeightRecord] = useState<WeightRecord | null>(null);

  // Snapshot the chart palette once on mount; reads CSS variables so chart
  // colors stay aligned with the design tokens.
  const chartPalette = useMemo(() => getChartPalette(), []);

  // Date range state — default to last 7 days
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { startDate: start, endDate: end };
  });
  const [dateError, setDateError] = useState<string>('');

  // Get weight records from cache. Memoize so referential identity is stable
  // across renders — required because it feeds the dependency array of
  // filteredRecords useMemo below.
  const weightRecords = useMemo(
    () => (selectedPet ? getCachedWeightRecords(selectedPet.id) : []),
    [selectedPet, getCachedWeightRecords]
  );
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

  // Filter records based on date range
  const filteredRecords = useMemo(() => {
    if (dateError) return weightRecords;
    const start = new Date(dateRange.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.endDate);
    end.setHours(23, 59, 59, 999);
    return weightRecords.filter(record => {
      const recordDate = utcToLocal(record.timestamp);
      return recordDate >= start && recordDate <= end;
    });
  }, [dateRange, dateError, weightRecords]);

  // Calculate chart data points
  const chartData = useMemo(() => {
    const start = new Date(dateRange.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.endDate);
    end.setHours(23, 59, 59, 999);
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
  }, [filteredRecords, dateRange]);

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

  // Format date for xAxis display
  const formatAxisDate = (value: number) => {
    const date = new Date(value);
    return formatDateShort(date);
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

  // Handle date range changes
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

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  if (!selectedPet) {
    return (
      <div className="p-4">
        <div className="surface-card p-6 text-center">
          <p className="text-text-secondary">Please select a pet to view weight records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 lg:p-6">
      {/* Weight Trend Chart - Priority at top, full width */}
      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-accent-teal/15 flex items-center justify-center mr-3">
              <TrendingUp className="w-5 h-5 text-accent-teal" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Weight Trend</h3>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoadingRecords}
            className="p-2 text-text-secondary hover:text-accent-teal hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh weight records"
          >
            <RefreshCw className={`w-5 h-5 ${isLoadingRecords ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formatDateForInput(dateRange.startDate)}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                max={formatDateForInput(dateRange.endDate)}
                className={`input-field ${dateError ? 'border-danger' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formatDateForInput(dateRange.endDate)}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                min={formatDateForInput(dateRange.startDate)}
                max={formatDateForInput(new Date())}
                className={`input-field ${dateError ? 'border-danger' : ''}`}
              />
            </div>
          </div>
          {dateError && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-2 mt-2">
              <p className="text-danger text-sm">{dateError}</p>
            </div>
          )}
        </div>

        {/* Chart Area */}
        {chartData.length > 0 ? (
          <div className="bg-surface-2 rounded-xl p-4 border border-border-subtle">
            <div className="w-full" style={{ height: '256px' }}>
              <LineChart
                xAxis={[{
                  data: chartDataForMUI.map(d => d.date),
                  valueFormatter: (value) => formatAxisDate(value),
                  scaleType: 'time',
                  label: 'Date',
                  labelStyle: {
                    fontSize: 12,
                    fill: chartPalette.textSecondary,
                  },
                  tickLabelStyle: {
                    fontSize: 11,
                    fill: chartPalette.textSecondary,
                  }
                }]}
                yAxis={[{
                  label: 'Weight (kg)',
                  labelStyle: {
                    fontSize: 12,
                    fill: chartPalette.textSecondary,
                  },
                  tickLabelStyle: {
                    fontSize: 11,
                    fill: chartPalette.textSecondary,
                  },
                  valueFormatter: (value: number) => `${value.toFixed(2)} kg`,
                  min: weightRange.min,
                  max: weightRange.max
                }]}
                series={[{
                  data: chartDataForMUI.map(d => d.weight),
                  color: chartPalette.accentTeal,
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
                sx={{
                  '& .MuiLineElement-root': {
                    strokeWidth: 3,
                    stroke: chartPalette.accentTeal,
                  },
                  '& .MuiMarkElement-root': {
                    fill: chartPalette.accentTeal,
                    stroke: chartPalette.surface2,
                    strokeWidth: 2,
                    r: 4,
                  },
                  '& .MuiChartsGrid-root line': {
                    stroke: chartPalette.borderSubtle,
                    strokeWidth: 1,
                  },
                  '& .MuiChartsAxis-root line': {
                    stroke: chartPalette.borderDefault,
                    strokeWidth: 1,
                  },
                  '& .MuiChartsAxis-root text': {
                    fill: chartPalette.textSecondary,
                    fontSize: 11,
                  },
                }}
              />
            </div>

            {/* Chart Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border-subtle">
              <div className="text-center">
                <p className="text-xs text-text-tertiary mb-1">Records</p>
                <p className="text-lg font-semibold text-text-primary">{filteredRecords.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary mb-1">Avg Weight</p>
                <p className="text-lg font-semibold text-text-primary">
                  {filteredRecords.length > 0
                    ? (filteredRecords.reduce((sum, r) => sum + r.weight, 0) / filteredRecords.length).toFixed(2)
                    : '-'}{' '}
                  kg
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-tertiary mb-1">Change</p>
                <p className="text-lg font-semibold text-text-primary">
                  {chartData.length >= 2
                    ? `${(chartData[chartData.length - 1].weight - chartData[0].weight).toFixed(2)} kg`
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-surface-2 rounded-xl p-8 border-2 border-dashed border-border-subtle">
            <div className="text-center text-text-tertiary">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No weight records for selected period</p>
            </div>
          </div>
        )}
      </div>

      {/* Weight Records Card - Add button at top, history below */}
      <div className="surface-card p-5">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-accent-teal/15 flex items-center justify-center mr-3">
            <Scale className="w-5 h-5 text-accent-teal" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">Weight Records</h3>
        </div>

        {/* Add New Weight Button */}
        <button
          onClick={() => setIsFormOpen(true)}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 mb-4"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Add New Weight</span>
        </button>

        {/* Weight Records History */}
        {isLoadingRecords ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-accent-teal animate-spin" />
            <span className="ml-3 text-text-secondary">Loading records...</span>
          </div>
        ) : recordsError ? (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-4">
            <p className="text-danger text-sm">{recordsError}</p>
            <button
              onClick={() => selectedPet && refreshWeightRecords(selectedPet.id, { number: 10 })}
              className="mt-2 text-sm text-danger underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        ) : weightRecords.length > 0 ? (
          <div className="space-y-2">
            {weightRecords.map((record, index) => (
              <div
                key={record.id}
                className={`rounded-xl p-4 border transition-colors ${
                  index === 0
                    ? 'bg-accent-teal/10 border-accent-teal/30'
                    : 'bg-surface-2 border-border-subtle hover:bg-surface-3'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {index === 0 && (
                      <span className="text-xs font-medium text-accent-teal mr-2 px-2 py-0.5 bg-accent-teal/15 rounded">
                        Latest
                      </span>
                    )}
                    <span className="scale-display text-2xl font-bold px-3 py-1 rounded-lg">
                      {record.weight.toFixed(1)} kg
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                  <div className="flex items-center text-sm text-text-secondary">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{formatLocalDate(record.timestamp)}</span>
                    </div>
                    <button
                      onClick={() => handleUpdateClick(record)}
                      className="p-2 text-text-tertiary hover:text-accent-teal hover:bg-surface-3 rounded-lg transition-colors"
                      title="Edit weight record"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {record.user_name && (
                  <div className="flex items-center text-sm text-text-tertiary mt-2">
                    <User className="w-4 h-4 mr-1" />
                    <span>{record.user_name}</span>
                  </div>
                )}
                {record.notes && (
                  <div className="mt-2 pt-2 border-t border-border-subtle">
                    <p className="text-sm text-text-secondary">{record.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-2 rounded-xl p-8 border-2 border-dashed border-border-subtle">
            <div className="text-center text-text-tertiary">
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
