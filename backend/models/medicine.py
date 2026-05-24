"""Medicine model + DTOs.

Three layers:
  1. `medications`        — group-scoped catalog of meds (name, type, default
                            dosage, dosage_unit, notes). One row per distinct
                            product the household uses.
  2. `treatment_courses`  — pet-scoped recurring schedules (start_date,
                            frequency_days, times_per_day[]). Open-ended if
                            `end_date IS NULL`.
  3. `medication_logs`    — pet-scoped actual administration records. Can be
                            linked to a course (`course_id`) or ad-hoc
                            (`course_id IS NULL`).

`times_per_day` is a Postgres ENUM array (`time_of_day_enum[]`). We pass it
as a list of strings; the service uses `::time_of_day_enum[]` casts on
INSERT / UPDATE so asyncpg doesn't have to introspect the column.
"""

from datetime import date as _date
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


medication_table = "medications"
treatment_course_table = "treatment_courses"
medication_log_table = "medication_logs"


class MedicationType(str, Enum):
    ORAL = "oral"
    TOPICAL = "topical"
    INJECTION = "injection"
    EYE_DROPS = "eye_drops"
    EAR_DROPS = "ear_drops"
    OTHER = "other"


class DosageUnit(str, Enum):
    TABLET = "tablet"
    ML = "ml"
    MG = "mg"
    DROPS = "drops"
    PUFF = "puff"
    UNIT = "unit"
    APPLICATION = "application"


class TimeOfDay(str, Enum):
    ALL_DAY = "all_day"
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"


class CourseStatusFilter(str, Enum):
    ACTIVE = "active"
    ENDED = "ended"
    ALL = "all"


# ────── Medication request DTOs ──────


class CreateMedicationRequest(BaseModel):
    group_id: str
    name: str = Field(..., max_length=100)
    medication_type: MedicationType
    dosage_unit: DosageUnit
    default_dosage: float | None = Field(None, gt=0)
    notes: str | None = Field(None, max_length=500)


class UpdateMedicationRequest(BaseModel):
    medication_id: str
    name: str | None = Field(None, max_length=100)
    medication_type: MedicationType | None = None
    default_dosage: float | None = Field(None, gt=0)
    dosage_unit: DosageUnit | None = None
    notes: str | None = Field(None, max_length=500)


class DeleteMedicationRequest(BaseModel):
    medication_id: str


# ────── Course request DTOs ──────


class CreateCourseRequest(BaseModel):
    pet_id: str
    medication_id: str
    dosage: float = Field(..., gt=0)
    dosage_unit: DosageUnit
    start_date: _date
    end_date: _date | None = None
    frequency_days: int = Field(1, ge=1, le=365)
    times_per_day: list[TimeOfDay] = Field(default_factory=lambda: [TimeOfDay.MORNING])
    notes: str | None = Field(None, max_length=500)


class UpdateCourseRequest(BaseModel):
    course_id: str
    dosage: float | None = Field(None, gt=0)
    dosage_unit: DosageUnit | None = None
    frequency_days: int | None = Field(None, ge=1, le=365)
    times_per_day: list[TimeOfDay] | None = None
    end_date: _date | None = None
    notes: str | None = Field(None, max_length=500)
    # When frequency_days changes, reset start_date to this local date so the
    # cadence kicks off "today" from the client's perspective.
    local_date: _date | None = None


class EndCourseRequest(BaseModel):
    course_id: str
    local_date: _date | None = None  # defaults to today (UTC)


# ────── Log request DTOs ──────


class CreateLogRequest(BaseModel):
    pet_id: str
    medication_id: str
    course_id: str | None = None
    dosage: float = Field(..., gt=0)
    dosage_unit: DosageUnit
    time_of_day: TimeOfDay | None = None
    administered_at: datetime | None = None  # defaults to "now"
    notes: str | None = Field(None, max_length=500)


class DeleteLogRequest(BaseModel):
    log_id: str


# ────── Response DTOs ──────


class MedicationInfo(BaseModel):
    id: str
    group_id: str
    name: str
    medication_type: MedicationType
    default_dosage: float | None = None
    dosage_unit: DosageUnit
    notes: str | None = None
    creator_id: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TreatmentCourseInfo(BaseModel):
    id: str
    pet_id: str
    pet_name: str
    medication_id: str
    medication_name: str
    medication_type: MedicationType
    group_id: str
    dosage: float
    dosage_unit: DosageUnit
    frequency_days: int
    times_per_day: list[TimeOfDay]
    start_date: _date
    end_date: _date | None = None
    notes: str | None = None
    created_by: str | None = None
    created_by_name: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class MedicationLogInfo(BaseModel):
    id: str
    pet_id: str
    medication_id: str
    medication_name: str
    group_id: str
    course_id: str | None = None
    dosage: float
    dosage_unit: DosageUnit
    time_of_day: TimeOfDay | None = None
    administered_at: datetime
    administered_by: str | None = None
    administered_by_name: str | None = None
    notes: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ScheduledItem(BaseModel):
    course_id: str
    medication_id: str
    medication_name: str
    medication_type: MedicationType
    dosage: float
    dosage_unit: DosageUnit
    time_of_day: TimeOfDay
    is_done: bool
    log_id: str | None = None
    administered_by_name: str | None = None
    administered_at: datetime | None = None


class TodayScheduleResponse(BaseModel):
    pet_id: str
    date: str  # YYYY-MM-DD
    scheduled_items: list[ScheduledItem]
    ad_hoc_logs: list[MedicationLogInfo]
    total_scheduled: int
    total_done: int
    total_ad_hoc: int
