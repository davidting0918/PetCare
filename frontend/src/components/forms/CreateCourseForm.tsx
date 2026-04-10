import React, { useState } from 'react';
import { X, Stethoscope, Loader2 } from 'lucide-react';
import { TIME_OF_DAY_LABELS, DOSAGE_UNIT_LABELS } from '../../constants/medicationTypes';
import type { MedicationInfo, DosageUnit, TimeOfDay } from '../../types';

interface CreateCourseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    medication_id: string;
    dosage: number;
    dosage_unit: DosageUnit;
    frequency_days: number;
    times_per_day: TimeOfDay[];
    start_date: string;
    notes?: string;
  }) => Promise<void>;
  medications: MedicationInfo[];
}

const TIME_OPTIONS: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'all_day'];

export const CreateCourseForm: React.FC<CreateCourseFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  medications,
}) => {
  const [medicationId, setMedicationId] = useState('');
  const [dosage, setDosage] = useState('');
  const [dosageUnit, setDosageUnit] = useState<DosageUnit>('tablet');
  const [frequencyDays, setFrequencyDays] = useState('1');
  const [timesPerDay, setTimesPerDay] = useState<TimeOfDay[]>(['morning']);
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleMedicationChange = (id: string) => {
    setMedicationId(id);
    const med = medications.find((m) => m.id === id);
    if (med) {
      if (med.default_dosage) setDosage(med.default_dosage.toString());
      setDosageUnit(med.dosage_unit);
    }
  };

  const toggleTime = (time: TimeOfDay) => {
    if (time === 'all_day') {
      setTimesPerDay(['all_day']);
      return;
    }
    // Deselect all_day when picking specific times
    const filtered = timesPerDay.filter((t) => t !== 'all_day');
    if (filtered.includes(time)) {
      const next = filtered.filter((t) => t !== time);
      setTimesPerDay(next.length > 0 ? next : ['morning']);
    } else {
      setTimesPerDay([...filtered, time]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicationId) {
      setError('Please select a medication');
      return;
    }
    if (!dosage || parseFloat(dosage) <= 0) {
      setError('Please enter a valid dosage');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit({
        medication_id: medicationId,
        dosage: parseFloat(dosage),
        dosage_unit: dosageUnit,
        frequency_days: parseInt(frequencyDays) || 1,
        times_per_day: timesPerDay,
        start_date: startDate,
        notes: notes.trim() || undefined,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMedicationId('');
    setDosage('');
    setDosageUnit('tablet');
    setFrequencyDays('1');
    setTimesPerDay(['morning']);
    setStartDate(new Date().toLocaleDateString('en-CA'));
    setNotes('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-2 rounded-2xl border border-border-default shadow-elevated max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-accent-purple" />
            <h2 className="text-lg font-bold text-text-primary">New Treatment Course</h2>
          </div>
          <button onClick={handleClose} disabled={isSubmitting} className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-3 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
              <p className="text-danger text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Medication *</label>
            <select
              value={medicationId}
              onChange={(e) => handleMedicationChange(e.target.value)}
              className="input-field"
              disabled={isSubmitting}
            >
              <option value="">Select a medication...</option>
              {medications.map((med) => (
                <option key={med.id} value={med.id}>{med.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Dosage *</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="input-field"
                placeholder="0.0"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Unit</label>
              <select
                value={dosageUnit}
                onChange={(e) => setDosageUnit(e.target.value as DosageUnit)}
                className="input-field"
                disabled={isSubmitting}
              >
                {Object.entries(DOSAGE_UNIT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Frequency (every N days) *
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={frequencyDays}
              onChange={(e) => setFrequencyDays(e.target.value)}
              className="input-field"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Time of Day *</label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OPTIONS.map((time) => {
                const isSelected = timesPerDay.includes(time);
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => toggleTime(time)}
                    className={`py-2 px-3 rounded-xl border text-sm transition-colors ${
                      isSelected
                        ? 'bg-accent-purple/15 border-accent-purple/30 text-accent-purple'
                        : 'border-border-subtle text-text-tertiary hover:border-border-default'
                    }`}
                  >
                    {TIME_OF_DAY_LABELS[time]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input-field resize-none"
              placeholder="Treatment notes..."
              maxLength={500}
              disabled={isSubmitting}
            />
          </div>
        </form>

        <div className="flex gap-3 p-5 border-t border-border-subtle">
          <button type="button" onClick={handleClose} disabled={isSubmitting} className="btn-secondary flex-1 py-2.5">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isSubmitting ? 'Creating...' : 'Start Treatment'}
          </button>
        </div>
      </div>
    </div>
  );
};
