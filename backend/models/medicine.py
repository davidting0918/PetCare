from datetime import datetime as dt
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field

medication_table = "medications"
treatment_course_table = "treatment_courses"
medication_log_table = "medication_logs"


# ================== Enums ==================


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


# ================== Request Models ==================


class CreateMedicationRequest(BaseModel):
    group_id: str = Field(..., description="Group that owns this medication")
    name: str = Field(..., max_length=100, description="Medication name")
    medication_type: MedicationType = Field(..., description="Type of medication")
    default_dosage: Optional[float] = Field(None, gt=0, description="Default dosage amount")
    dosage_unit: DosageUnit = Field(..., description="Unit of dosage measurement")
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")


class UpdateMedicationRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    medication_type: Optional[MedicationType] = None
    default_dosage: Optional[float] = Field(None, gt=0)
    dosage_unit: Optional[DosageUnit] = None
    notes: Optional[str] = Field(None, max_length=500)


class CreateCourseRequest(BaseModel):
    pet_id: str = Field(..., description="Pet receiving the treatment")
    medication_id: str = Field(..., description="Medication being administered")
    group_id: str = Field(..., description="Group context")
    dosage: float = Field(..., gt=0, description="Dosage amount per administration")
    dosage_unit: DosageUnit = Field(..., description="Dosage unit")
    frequency_days: int = Field(1, ge=1, le=365, description="Every N days")
    times_per_day: List[TimeOfDay] = Field(default=["morning"], description="Time slots per dosing day")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD), null = open-ended")
    notes: Optional[str] = Field(None, max_length=500)


class UpdateCourseRequest(BaseModel):
    dosage: Optional[float] = Field(None, gt=0)
    dosage_unit: Optional[DosageUnit] = None
    frequency_days: Optional[int] = Field(None, ge=1, le=365)
    times_per_day: Optional[List[TimeOfDay]] = None
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    notes: Optional[str] = Field(None, max_length=500)
    local_date: Optional[str] = Field(None, description="Client local date (YYYY-MM-DD) for frequency reset")


class CreateLogRequest(BaseModel):
    pet_id: str = Field(..., description="Pet that received medication")
    medication_id: str = Field(..., description="Medication administered")
    group_id: str = Field(..., description="Group context")
    course_id: Optional[str] = Field(None, description="Treatment course (null for ad-hoc)")
    dosage: float = Field(..., gt=0, description="Actual dosage administered")
    dosage_unit: DosageUnit = Field(..., description="Dosage unit")
    time_of_day: Optional[TimeOfDay] = Field(None, description="Time slot")
    notes: Optional[str] = Field(None, max_length=500)


# ================== Response Models ==================


class MedicationInfo(BaseModel):
    id: str
    group_id: str
    name: str
    medication_type: MedicationType
    default_dosage: Optional[float] = None
    dosage_unit: DosageUnit
    notes: Optional[str] = None
    creator_id: Optional[str] = None
    is_active: bool
    created_at: dt
    updated_at: dt


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
    times_per_day: List[str]
    start_date: str
    end_date: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    is_active: bool
    created_at: dt
    updated_at: dt


class MedicationLogInfo(BaseModel):
    id: str
    pet_id: str
    medication_id: str
    medication_name: str
    group_id: str
    course_id: Optional[str] = None
    dosage: float
    dosage_unit: DosageUnit
    time_of_day: Optional[str] = None
    administered_at: dt
    administered_by: Optional[str] = None
    administered_by_name: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: dt
    updated_at: dt


class ScheduledItem(BaseModel):
    course_id: str
    medication_id: str
    medication_name: str
    medication_type: MedicationType
    dosage: float
    dosage_unit: DosageUnit
    time_of_day: str
    is_done: bool
    log_id: Optional[str] = None
    administered_by_name: Optional[str] = None
    administered_at: Optional[dt] = None


class TodayScheduleResponse(BaseModel):
    pet_id: str
    date: str
    scheduled_items: List[ScheduledItem]
    ad_hoc_logs: List[MedicationLogInfo]
    summary: dict
