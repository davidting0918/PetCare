import React, { useState, useRef, useEffect } from 'react';
import { Plus, MoreVertical, Pencil, Trash2, Loader2, Database } from 'lucide-react';
import { getMedicationTypeConfig, DOSAGE_UNIT_LABELS } from '../../constants/medicationTypes';
import type { MedicationInfo } from '../../types';

interface MedicationDatabaseProps {
  medications: MedicationInfo[];
  canEdit: boolean;
  isLoading: boolean;
  onAddMedication: () => void;
  onEditMedication: (medication: MedicationInfo) => void;
  onDeleteMedication: (medication: MedicationInfo) => void;
}

export const MedicationDatabase: React.FC<MedicationDatabaseProps> = ({
  medications,
  canEdit,
  isLoading,
  onAddMedication,
  onEditMedication,
  onDeleteMedication,
}) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-accent-blue" />
          <h3 className="text-base font-semibold text-text-primary">Medication Database</h3>
        </div>
        {canEdit && (
          <button
            onClick={onAddMedication}
            className="w-8 h-8 rounded-full bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/25 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {isLoading && medications.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
        </div>
      ) : medications.length === 0 ? (
        <div className="text-center py-6">
          <Database className="w-10 h-10 text-text-disabled mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No medications added yet</p>
          {canEdit && (
            <button onClick={onAddMedication} className="text-xs text-accent-blue hover:underline mt-1">
              Add your first medication
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" ref={menuRef}>
          {medications.map((med) => {
            const config = getMedicationTypeConfig(med.medication_type);
            const Icon = config.icon;

            return (
              <div
                key={med.id}
                className="relative bg-surface-1 rounded-xl p-3 border border-border-subtle hover:border-border-default transition-colors"
              >
                {canEdit && (
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === med.id ? null : med.id);
                      }}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpenId === med.id && (
                      <div className="absolute right-0 mt-1 w-36 bg-surface-3 rounded-xl border border-border-subtle shadow-elevated z-20 overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                            onEditMedication(med);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-2 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(null);
                            onDeleteMedication(med);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-surface-2 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 ${config.bgClass}`}>
                  <Icon className={`w-6 h-6 ${config.textClass}`} />
                </div>
                <p className="text-sm font-medium text-text-primary truncate pr-8">
                  {med.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgClass} ${config.textClass}`}>
                    {config.label}
                  </span>
                  {med.default_dosage != null && (
                    <span className="text-xs text-text-tertiary">
                      {med.default_dosage} {DOSAGE_UNIT_LABELS[med.dosage_unit] || med.dosage_unit}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
