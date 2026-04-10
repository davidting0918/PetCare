import React, { useState } from 'react';
import { Check, Clock, Loader2, Undo2, Pill } from 'lucide-react';
import { getMedicationTypeConfig, TIME_OF_DAY_LABELS, DOSAGE_UNIT_LABELS } from '../../constants/medicationTypes';
import type { ScheduledItem, TodayScheduleResponse } from '../../types';

interface TodayMedicationChecklistProps {
  schedule: TodayScheduleResponse | null;
  groupId: string;
  petId: string;
  canEdit: boolean;
  onMarkDone: (item: ScheduledItem) => Promise<void>;
  onUndoMarkDone: (item: ScheduledItem) => Promise<void>;
  isLoading: boolean;
}

export const TodayMedicationChecklist: React.FC<TodayMedicationChecklistProps> = ({
  schedule,
  canEdit,
  onMarkDone,
  onUndoMarkDone,
  isLoading,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const items = schedule?.scheduled_items || [];
  const summary = schedule?.summary;

  const handleToggle = async (item: ScheduledItem) => {
    const key = `${item.course_id}_${item.time_of_day}`;
    setProcessingId(key);
    try {
      if (item.is_done) {
        await onUndoMarkDone(item);
      } else {
        await onMarkDone(item);
      }
    } finally {
      setProcessingId(null);
    }
  };

  // Sort: pending first, then done
  const sortedItems = [...items].sort((a, b) => {
    if (a.is_done === b.is_done) return 0;
    return a.is_done ? 1 : -1;
  });

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent-teal" />
          <h3 className="text-base font-semibold text-text-primary">Today's Medications</h3>
        </div>
        {summary && summary.total_scheduled > 0 && (
          <span className="text-xs font-medium text-text-tertiary bg-surface-1 px-2 py-1 rounded-full">
            {summary.completed}/{summary.total_scheduled}
          </span>
        )}
      </div>

      {isLoading && items.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-accent-teal animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-6">
          <Pill className="w-10 h-10 text-text-disabled mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No medications scheduled for today</p>
          <p className="text-xs text-text-disabled mt-1">Create a treatment course to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedItems.map((item) => {
            const config = getMedicationTypeConfig(item.medication_type);
            const Icon = config.icon;
            const key = `${item.course_id}_${item.time_of_day}`;
            const isProcessing = processingId === key;

            return (
              <div
                key={key}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  item.is_done
                    ? 'bg-success/5 border-success/20'
                    : 'bg-surface-1 border-border-subtle'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgClass}`}>
                  <Icon className={`w-4 h-4 ${config.textClass}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${item.is_done ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                    {item.medication_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-tertiary">
                      {item.dosage} {DOSAGE_UNIT_LABELS[item.dosage_unit] || item.dosage_unit}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgClass} ${config.textClass}`}>
                      {TIME_OF_DAY_LABELS[item.time_of_day] || item.time_of_day}
                    </span>
                  </div>
                  {item.is_done && item.administered_by_name && (
                    <p className="text-xs text-success mt-0.5">
                      Done by {item.administered_by_name}
                    </p>
                  )}
                </div>

                {canEdit && (
                  <button
                    onClick={() => handleToggle(item)}
                    disabled={isProcessing}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                      item.is_done
                        ? 'bg-success/15 text-success hover:bg-success/25'
                        : 'bg-surface-2 text-text-tertiary hover:bg-accent-teal/15 hover:text-accent-teal'
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : item.is_done ? (
                      <Undo2 className="w-4 h-4" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
