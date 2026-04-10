import React, { useState } from 'react';
import { X, CalendarDays, Clock, Loader2 } from 'lucide-react';
import { getMedicationTypeConfig, TIME_OF_DAY_LABELS, DOSAGE_UNIT_LABELS } from '../../constants/medicationTypes';
import type { TreatmentCourseInfo } from '../../types';

interface CourseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: TreatmentCourseInfo | null;
  canEdit: boolean;
  onEndCourse: (courseId: string) => Promise<void>;
}

export const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({
  isOpen,
  onClose,
  course,
  canEdit,
  onEndCourse,
}) => {
  const [isEnding, setIsEnding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen || !course) return null;

  const config = getMedicationTypeConfig(course.medication_type);
  const Icon = config.icon;
  const timesLabel = course.times_per_day.map((t) => TIME_OF_DAY_LABELS[t] || t).join(', ');
  const freqLabel = course.frequency_days === 1 ? 'Every day' : `Every ${course.frequency_days} days`;
  const isEnded = !!course.end_date && new Date(course.end_date) < new Date();

  const handleEnd = async () => {
    setIsEnding(true);
    try {
      await onEndCourse(course.id);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setIsEnding(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-2 rounded-2xl border border-border-default shadow-elevated max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h2 className="text-lg font-bold text-text-primary">Treatment Details</h2>
          <button onClick={onClose} className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-3 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Medication info */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bgClass}`}>
              <Icon className={`w-6 h-6 ${config.textClass}`} />
            </div>
            <div>
              <p className="text-base font-semibold text-text-primary">{course.medication_name}</p>
              <span className={`text-xs px-2 py-0.5 rounded ${config.bgClass} ${config.textClass}`}>
                {config.label}
              </span>
            </div>
          </div>

          {/* Details grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border-subtle">
              <span className="text-sm text-text-tertiary">Pet</span>
              <span className="text-sm font-medium text-text-primary">{course.pet_name}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border-subtle">
              <span className="text-sm text-text-tertiary">Dosage</span>
              <span className="text-sm font-medium text-text-primary">
                {course.dosage} {DOSAGE_UNIT_LABELS[course.dosage_unit] || course.dosage_unit}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border-subtle">
              <span className="text-sm text-text-tertiary flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Frequency
              </span>
              <span className="text-sm font-medium text-text-primary">{freqLabel}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border-subtle">
              <span className="text-sm text-text-tertiary">Time Slots</span>
              <span className="text-sm font-medium text-text-primary">{timesLabel}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border-subtle">
              <span className="text-sm text-text-tertiary flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" /> Start
              </span>
              <span className="text-sm font-medium text-text-primary">{course.start_date}</span>
            </div>
            {course.end_date && (
              <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                <span className="text-sm text-text-tertiary flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" /> End
                </span>
                <span className="text-sm font-medium text-text-primary">{course.end_date}</span>
              </div>
            )}
            {course.notes && (
              <div className="py-2">
                <span className="text-sm text-text-tertiary">Notes</span>
                <p className="text-sm text-text-primary mt-1">{course.notes}</p>
              </div>
            )}
            {course.created_by_name && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-text-tertiary">Created by</span>
                <span className="text-sm text-text-secondary">{course.created_by_name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-border-subtle space-y-2">
          {canEdit && !isEnded && !showConfirm && (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full py-2.5 rounded-xl border border-danger/30 text-danger text-sm font-medium hover:bg-danger/10 transition-colors"
            >
              End Treatment
            </button>
          )}
          {showConfirm && (
            <div className="bg-danger/5 border border-danger/20 rounded-xl p-3 space-y-2">
              <p className="text-sm text-danger">End this treatment course? This will stop it from appearing in today's schedule.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isEnding}
                  className="btn-secondary flex-1 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnd}
                  disabled={isEnding}
                  className="flex-1 py-2 rounded-xl bg-danger text-white text-sm font-medium hover:bg-danger/90 transition-colors flex items-center justify-center gap-2"
                >
                  {isEnding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isEnding ? 'Ending...' : 'Confirm End'}
                </button>
              </div>
            </div>
          )}
          <button onClick={onClose} className="btn-secondary w-full py-2.5">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
