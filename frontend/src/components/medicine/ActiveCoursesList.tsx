import React from 'react';
import { CalendarDays, Plus, Loader2, Stethoscope } from 'lucide-react';
import { getMedicationTypeConfig, TIME_OF_DAY_LABELS, DOSAGE_UNIT_LABELS } from '../../constants/medicationTypes';
import type { TreatmentCourseInfo } from '../../types';

interface ActiveCoursesListProps {
  courses: TreatmentCourseInfo[];
  canEdit: boolean;
  isLoading: boolean;
  onCourseClick: (course: TreatmentCourseInfo) => void;
  onAddCourse: () => void;
}

export const ActiveCoursesList: React.FC<ActiveCoursesListProps> = ({
  courses,
  canEdit,
  isLoading,
  onCourseClick,
  onAddCourse,
}) => {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-accent-purple" />
          <h3 className="text-base font-semibold text-text-primary">Active Treatments</h3>
        </div>
        {canEdit && (
          <button
            onClick={onAddCourse}
            className="w-8 h-8 rounded-full bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {isLoading && courses.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-accent-purple animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-6">
          <Stethoscope className="w-10 h-10 text-text-disabled mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No active treatments</p>
          {canEdit && (
            <button onClick={onAddCourse} className="text-xs text-accent-purple hover:underline mt-1">
              Start a treatment course
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {courses.map((course) => {
            const config = getMedicationTypeConfig(course.medication_type);
            const Icon = config.icon;
            const timesLabel = course.times_per_day
              .map((t) => TIME_OF_DAY_LABELS[t] || t)
              .join(' + ');
            const freqLabel = course.frequency_days === 1
              ? 'Every day'
              : `Every ${course.frequency_days} days`;

            return (
              <button
                key={course.id}
                onClick={() => onCourseClick(course)}
                className="w-full text-left p-3 rounded-xl border border-border-subtle bg-surface-1 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bgClass}`}>
                    <Icon className={`w-5 h-5 ${config.textClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {course.medication_name}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {course.dosage} {DOSAGE_UNIT_LABELS[course.dosage_unit] || course.dosage_unit} &middot; {freqLabel}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgClass} ${config.textClass}`}>
                        {timesLabel}
                      </span>
                      <span className="text-xs text-text-disabled flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {course.start_date}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
