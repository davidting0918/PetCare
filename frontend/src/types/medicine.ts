// ===== Medicine Domain Types =====

export type MedicationType = 'oral' | 'topical' | 'injection' | 'eye_drops' | 'ear_drops' | 'other';

export type DosageUnit = 'tablet' | 'ml' | 'mg' | 'drops' | 'puff' | 'unit' | 'application';

export type TimeOfDay = 'all_day' | 'morning' | 'afternoon' | 'evening';

// ===== Response Types =====

export interface MedicationInfo {
  id: string;
  group_id: string;
  name: string;
  medication_type: MedicationType;
  default_dosage?: number | null;
  dosage_unit: DosageUnit;
  notes?: string | null;
  creator_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TreatmentCourseInfo {
  id: string;
  pet_id: string;
  pet_name: string;
  medication_id: string;
  medication_name: string;
  medication_type: MedicationType;
  group_id: string;
  dosage: number;
  dosage_unit: DosageUnit;
  frequency_days: number;
  times_per_day: string[];
  start_date: string;
  end_date?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicationLogInfo {
  id: string;
  pet_id: string;
  medication_id: string;
  medication_name: string;
  group_id: string;
  course_id?: string | null;
  dosage: number;
  dosage_unit: DosageUnit;
  time_of_day?: string | null;
  administered_at: string;
  administered_by?: string | null;
  administered_by_name?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduledItem {
  course_id: string;
  medication_id: string;
  medication_name: string;
  medication_type: MedicationType;
  dosage: number;
  dosage_unit: DosageUnit;
  time_of_day: string;
  is_done: boolean;
  log_id?: string | null;
  administered_by_name?: string | null;
  administered_at?: string | null;
}

export interface TodayScheduleResponse {
  pet_id: string;
  date: string;
  scheduled_items: ScheduledItem[];
  ad_hoc_logs: MedicationLogInfo[];
  summary: {
    total_scheduled: number;
    completed: number;
    pending: number;
  };
}

// ===== Request Types =====

export interface CreateMedicationRequest {
  group_id: string;
  name: string;
  medication_type: MedicationType;
  default_dosage?: number;
  dosage_unit: DosageUnit;
  notes?: string;
}

export interface UpdateMedicationRequest {
  name?: string;
  medication_type?: MedicationType;
  default_dosage?: number;
  dosage_unit?: DosageUnit;
  notes?: string;
}

export interface CreateCourseRequest {
  pet_id: string;
  medication_id: string;
  group_id: string;
  dosage: number;
  dosage_unit: DosageUnit;
  frequency_days: number;
  times_per_day: TimeOfDay[];
  start_date: string;
  end_date?: string;
  notes?: string;
}

export interface UpdateCourseRequest {
  dosage?: number;
  dosage_unit?: DosageUnit;
  frequency_days?: number;
  times_per_day?: TimeOfDay[];
  end_date?: string;
  notes?: string;
  local_date?: string;
}

export interface CreateLogRequest {
  pet_id: string;
  medication_id: string;
  group_id: string;
  course_id?: string;
  dosage: number;
  dosage_unit: DosageUnit;
  time_of_day?: TimeOfDay;
  notes?: string;
}
