import React, { useState } from 'react';
import { X, Pill, Loader2 } from 'lucide-react';
import { MEDICATION_TYPES, DOSAGE_UNIT_LABELS } from '../../constants/medicationTypes';
import type { MedicationType, DosageUnit } from '../../types';

interface CreateMedicationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    medication_type: MedicationType;
    default_dosage?: number;
    dosage_unit: DosageUnit;
    notes?: string;
  }) => Promise<void>;
  editData?: {
    name: string;
    medication_type: MedicationType;
    default_dosage?: number | null;
    dosage_unit: DosageUnit;
    notes?: string | null;
  };
  title?: string;
}

export const CreateMedicationForm: React.FC<CreateMedicationFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editData,
  title = 'Add Medication',
}) => {
  const [name, setName] = useState(editData?.name || '');
  const [medicationType, setMedicationType] = useState<MedicationType>(editData?.medication_type || 'oral');
  const [defaultDosage, setDefaultDosage] = useState<string>(editData?.default_dosage?.toString() || '');
  const [dosageUnit, setDosageUnit] = useState<DosageUnit>(editData?.dosage_unit || 'tablet');
  const [notes, setNotes] = useState(editData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Medication name is required');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit({
        name: name.trim(),
        medication_type: medicationType,
        default_dosage: defaultDosage ? parseFloat(defaultDosage) : undefined,
        dosage_unit: dosageUnit,
        notes: notes.trim() || undefined,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save medication');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setMedicationType('oral');
    setDefaultDosage('');
    setDosageUnit('tablet');
    setNotes('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const medTypeEntries = Object.entries(MEDICATION_TYPES) as [MedicationType, typeof MEDICATION_TYPES[MedicationType]][];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-2 rounded-2xl border border-border-default shadow-elevated max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-accent-pink" />
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
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
            <label className="block text-sm font-medium text-text-secondary mb-1">Medication Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="e.g., Amoxicillin"
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {medTypeEntries.map(([key, config]) => {
                const Icon = config.icon;
                const isSelected = medicationType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMedicationType(key)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-colors ${
                      isSelected
                        ? `${config.bgClass} ${config.borderClass} border`
                        : 'border-border-subtle hover:border-border-default'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? config.textClass : 'text-text-tertiary'}`} />
                    <span className={`text-xs ${isSelected ? config.textClass : 'text-text-tertiary'}`}>
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Default Dosage</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={defaultDosage}
                onChange={(e) => setDefaultDosage(e.target.value)}
                className="input-field"
                placeholder="0.0"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Unit *</label>
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
            <label className="block text-sm font-medium text-text-secondary mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input-field resize-none"
              placeholder="Additional information..."
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
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
