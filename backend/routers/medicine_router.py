"""Medicine endpoints — GET/POST only, no path params.

Three sub-resources:
  - `/medicine/medication/*` — group-scoped catalog
  - `/medicine/course/*`     — pet-scoped recurring schedules
  - `/medicine/log/*`        — administration records

Plus `/medicine/today` which combines course + log data into a per-pet
"what's due today and what's been given" view.
"""

from datetime import date as _date
from typing import Annotated

from fastapi import APIRouter, Depends

from backend.core.db_manager import get_db
from backend.models.medicine import (
    CourseStatusFilter,
    CreateCourseRequest,
    CreateLogRequest,
    CreateMedicationRequest,
    DeleteLogRequest,
    DeleteMedicationRequest,
    EndCourseRequest,
    MedicationInfo,
    MedicationLogInfo,
    TodayScheduleResponse,
    TreatmentCourseInfo,
    UpdateCourseRequest,
    UpdateMedicationRequest,
)
from backend.models.user import User
from backend.services.auth_service import get_current_user
from backend.services.medicine_service import MedicineService

router = APIRouter(prefix="/medicine", tags=["medicine"])


def get_medicine_service() -> MedicineService:
    return MedicineService(get_db())


# ─────── medications ───────


@router.post("/medication/create", response_model=MedicationInfo)
async def create_medication(
    body: CreateMedicationRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MedicineService, Depends(get_medicine_service)],
) -> MedicationInfo:
    return await service.create_medication(body, user.id)


@router.get("/medication/details", response_model=MedicationInfo)
async def medication_details(
    medication_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MedicineService, Depends(get_medicine_service)],
) -> MedicationInfo:
    return await service.get_medication(medication_id, user.id)


@router.get("/medication/list", response_model=list[MedicationInfo])
async def list_medications(
    group_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MedicineService, Depends(get_medicine_service)],
) -> list[MedicationInfo]:
    return await service.list_medications(group_id, user.id)


@router.post("/medication/update", response_model=MedicationInfo)
async def update_medication(
    body: UpdateMedicationRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MedicineService, Depends(get_medicine_service)],
) -> MedicationInfo:
    return await service.update_medication(body, user.id)


@router.post("/medication/delete")
async def delete_medication(
    body: DeleteMedicationRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MedicineService, Depends(get_medicine_service)],
) -> dict:
    return await service.delete_medication(body.medication_id, user.id)


# ─────── courses ───────


@router.post("/course/create", response_model=TreatmentCourseInfo)
async def create_course(
    body: CreateCourseRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MedicineService, Depends(get_medicine_service)],
) -> TreatmentCourseInfo:
    return await service.create_course(body, user.id)


@router.post("/course/update", response_model=TreatmentCourseInfo)
async def update_course(
    body: UpdateCourseRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MedicineService, Depends(get_medicine_service)],
) -> TreatmentCourseInfo:
    return await service.update_course(body, user.id)


@router.post("/course/end", response_model=TreatmentCourseInfo)
async def end_course(
    body: EndCourseRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MedicineService, Depends(get_medicine_service)],
) -> TreatmentCourseInfo:
    return await service.end_course(body, user.id)


@router.get("/course/details", response_model=TreatmentCourseInfo)
async def course_details(
    course_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MedicineService, Depends(get_medicine_service)],
) -> TreatmentCourseInfo:
    return await service.get_course(course_id, user.id)


@router.get("/course/list", response_model=list[TreatmentCourseInfo])
async def list_courses(
    pet_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MedicineService, Depends(get_medicine_service)],
    status: CourseStatusFilter = CourseStatusFilter.ACTIVE,
) -> list[TreatmentCourseInfo]:
    return await service.list_courses(pet_id, user.id, status)


# ─────── logs ───────


@router.post("/log/create", response_model=MedicationLogInfo)
async def create_log(
    body: CreateLogRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MedicineService, Depends(get_medicine_service)],
) -> MedicationLogInfo:
    return await service.create_log(body, user.id)


@router.post("/log/delete")
async def delete_log(
    body: DeleteLogRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MedicineService, Depends(get_medicine_service)],
) -> dict:
    return await service.delete_log(body.log_id, user.id)


# ─────── today's schedule ───────


@router.get("/today", response_model=TodayScheduleResponse)
async def today_schedule(
    pet_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MedicineService, Depends(get_medicine_service)],
    local_date: _date | None = None,
) -> TodayScheduleResponse:
    return await service.get_today_schedule(pet_id, user.id, local_date)
