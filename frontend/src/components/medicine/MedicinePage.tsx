import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { usePet, useMedicine } from '../../hooks';
import { TodayMedicationChecklist } from './TodayMedicationChecklist';
import { ActiveCoursesList } from './ActiveCoursesList';
import { MedicationDatabase } from './MedicationDatabase';
import { CreateMedicationForm } from '../forms/CreateMedicationForm';
import { CreateCourseForm } from '../forms/CreateCourseForm';
import { CourseDetailsModal } from '../forms/CourseDetailsModal';
import type {
  ScheduledItem,
  MedicationInfo,
  TreatmentCourseInfo,
  MedicationType,
  DosageUnit,
  TimeOfDay,
} from '../../types';

export const MedicinePage: React.FC = () => {
  const { selectedPet, userPets } = usePet();
  const {
    getMedications,
    addMedication,
    editMedication,
    deleteMedication,
    getCachedMedications,
    getCourses,
    addCourse,
    endTreatment,
    getCachedCourses,
    getTodaySchedule,
    markDone,
    undoMarkDone,
    getCachedTodaySchedule,
    isLoading,
  } = useMedicine();

  const pet = selectedPet;
  const petId = pet?.id;
  const groupId = pet?.group_id;
  const petAccess = userPets.find((p) => p.petId === petId);
  const canEdit = petAccess?.role !== 'Viewer';

  // Modal states
  const [showMedForm, setShowMedForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<TreatmentCourseInfo | null>(null);
  const [editingMed, setEditingMed] = useState<MedicationInfo | null>(null);

  const localDate = new Date().toLocaleDateString('en-CA');

  // Fetch data when pet changes
  useEffect(() => {
    if (petId && groupId) {
      getMedications(groupId);
      getCourses(petId);
      getTodaySchedule(petId, localDate);
    }
  }, [petId, groupId, getMedications, getCourses, getTodaySchedule, localDate]);

  const medications = groupId ? getCachedMedications(groupId) : [];
  const courses = petId ? getCachedCourses(petId) : [];
  const todaySchedule = petId ? getCachedTodaySchedule(petId) : null;

  const medsLoading = groupId ? isLoading(`meds_${groupId}`) : false;
  const coursesLoading = petId ? isLoading(`courses_${petId}`) : false;
  const todayLoading = petId ? isLoading(`today_${petId}`) : false;

  const refreshAll = useCallback(() => {
    if (petId && groupId) {
      getMedications(groupId);
      getCourses(petId);
      getTodaySchedule(petId, localDate);
    }
  }, [petId, groupId, getMedications, getCourses, getTodaySchedule, localDate]);

  // ===== Handlers =====

  const handleMarkDone = useCallback(async (item: ScheduledItem) => {
    if (!petId || !groupId) return;
    await markDone({
      pet_id: petId,
      medication_id: item.medication_id,
      group_id: groupId,
      course_id: item.course_id,
      dosage: item.dosage,
      dosage_unit: item.dosage_unit as DosageUnit,
      time_of_day: item.time_of_day as TimeOfDay,
    });
    await getTodaySchedule(petId, localDate);
  }, [petId, groupId, markDone, getTodaySchedule, localDate]);

  const handleUndoMarkDone = useCallback(async (item: ScheduledItem) => {
    if (!petId || !item.log_id) return;
    await undoMarkDone(item.log_id, petId);
    await getTodaySchedule(petId, localDate);
  }, [petId, undoMarkDone, getTodaySchedule, localDate]);

  const handleAddMedication = useCallback(async (data: {
    name: string;
    medication_type: MedicationType;
    default_dosage?: number;
    dosage_unit: DosageUnit;
    notes?: string;
  }) => {
    if (!groupId) return;
    await addMedication({ ...data, group_id: groupId });
    await getMedications(groupId);
  }, [groupId, addMedication, getMedications]);

  const handleEditMedication = useCallback(async (data: {
    name: string;
    medication_type: MedicationType;
    default_dosage?: number;
    dosage_unit: DosageUnit;
    notes?: string;
  }) => {
    if (!groupId || !editingMed) return;
    await editMedication(editingMed.id, groupId, data);
    await getMedications(groupId);
  }, [groupId, editingMed, editMedication, getMedications]);

  const handleDeleteMedication = useCallback(async (med: MedicationInfo) => {
    if (!groupId) return;
    if (!window.confirm(`Delete "${med.name}"?`)) return;
    await deleteMedication(med.id, groupId);
  }, [groupId, deleteMedication]);

  const handleAddCourse = useCallback(async (data: {
    medication_id: string;
    dosage: number;
    dosage_unit: DosageUnit;
    frequency_days: number;
    times_per_day: TimeOfDay[];
    start_date: string;
    notes?: string;
  }) => {
    if (!petId || !groupId) return;
    await addCourse({ ...data, pet_id: petId, group_id: groupId });
    refreshAll();
  }, [petId, groupId, addCourse, refreshAll]);

  const handleEndCourse = useCallback(async (courseId: string) => {
    if (!petId) return;
    await endTreatment(courseId, petId, localDate);
    refreshAll();
  }, [petId, endTreatment, localDate, refreshAll]);

  // ===== Render =====

  if (!pet) {
    return (
      <div className="p-4 space-y-4">
        <div className="surface-card p-6 text-center">
          <AlertCircle className="w-10 h-10 text-text-disabled mx-auto mb-2" />
          <p className="text-sm text-text-tertiary">No pet selected</p>
          <p className="text-xs text-text-disabled mt-1">Select a pet from the dashboard to manage medications</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 lg:p-6">
      <TodayMedicationChecklist
        schedule={todaySchedule}
        groupId={groupId || ''}
        petId={petId || ''}
        canEdit={canEdit}
        onMarkDone={handleMarkDone}
        onUndoMarkDone={handleUndoMarkDone}
        isLoading={todayLoading}
      />

      <ActiveCoursesList
        courses={courses}
        canEdit={canEdit}
        isLoading={coursesLoading}
        onCourseClick={(course) => setSelectedCourse(course)}
        onAddCourse={() => setShowCourseForm(true)}
      />

      <MedicationDatabase
        medications={medications}
        canEdit={canEdit}
        isLoading={medsLoading}
        onAddMedication={() => setShowMedForm(true)}
        onEditMedication={(med) => setEditingMed(med)}
        onDeleteMedication={handleDeleteMedication}
      />

      {/* Add medication modal */}
      <CreateMedicationForm
        isOpen={showMedForm}
        onClose={() => setShowMedForm(false)}
        onSubmit={handleAddMedication}
      />

      {/* Edit medication modal */}
      {editingMed && (
        <CreateMedicationForm
          isOpen={!!editingMed}
          onClose={() => setEditingMed(null)}
          onSubmit={handleEditMedication}
          editData={editingMed}
          title="Edit Medication"
        />
      )}

      {/* Create course modal */}
      <CreateCourseForm
        isOpen={showCourseForm}
        onClose={() => setShowCourseForm(false)}
        onSubmit={handleAddCourse}
        medications={medications}
      />

      {/* Course details modal */}
      <CourseDetailsModal
        isOpen={!!selectedCourse}
        onClose={() => setSelectedCourse(null)}
        course={selectedCourse}
        canEdit={canEdit}
        onEndCourse={handleEndCourse}
      />
    </div>
  );
};
