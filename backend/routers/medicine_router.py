from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query

from backend.models.medicine import (
    CreateCourseRequest,
    CreateLogRequest,
    CreateMedicationRequest,
    UpdateCourseRequest,
    UpdateMedicationRequest,
)
from backend.models.user import UserInfo
from backend.services.auth_service import get_current_user
from backend.services.medicine_service import MedicineService

router = APIRouter(prefix="/medicine", tags=["medicine"])
medicine_service = MedicineService()


# ================== Today's Schedule (before path params) ==================


@router.get("/today", response_model=dict)
async def get_today_schedule(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    pet_id: str = Query(..., description="Pet ID to get today's schedule for"),
    local_date: Optional[str] = Query(None, description="Client local date (YYYY-MM-DD)"),
) -> dict:
    """Get today's medication schedule with completion status."""
    try:
        schedule = await medicine_service.get_today_schedule(pet_id, current_user.id, local_date)
        return {
            "status": 1,
            "data": schedule.model_dump(),
            "message": f"Today's medication schedule for {schedule.date}",
        }
    except Exception as e:
        raise e


# ================== Medication CRUD ==================


@router.post("/create", response_model=dict)
async def create_medication(
    request: CreateMedicationRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """Create a new medication entry in the group's medication database."""
    try:
        medication = await medicine_service.create_medication(request, current_user.id)
        return {
            "status": 1,
            "data": medication.model_dump(),
            "message": f"Medication '{medication.name}' created successfully",
        }
    except Exception as e:
        raise e


@router.get("/list", response_model=dict)
async def list_medications(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    group_id: str = Query(..., description="Group ID to list medications for"),
) -> dict:
    """List all medications in a group."""
    try:
        medications = await medicine_service.list_medications(group_id, current_user.id)
        return {
            "status": 1,
            "data": [m.model_dump() for m in medications],
            "message": f"Found {len(medications)} medications",
        }
    except Exception as e:
        raise e


# ================== Treatment Course ==================


@router.post("/course/create", response_model=dict)
async def create_course(
    request: CreateCourseRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """Create a new treatment course for a pet."""
    try:
        course = await medicine_service.create_course(request, current_user.id)
        return {
            "status": 1,
            "data": course.model_dump(),
            "message": f"Treatment course for '{course.medication_name}' created successfully",
        }
    except Exception as e:
        raise e


@router.post("/course/{course_id}/update", response_model=dict)
async def update_course(
    course_id: str,
    request: UpdateCourseRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """Update an existing treatment course. If frequency_days changes, start_date resets to local_date."""
    try:
        course = await medicine_service.update_course(course_id, request, current_user.id)
        return {
            "status": 1,
            "data": course.model_dump(),
            "message": "Treatment course updated successfully",
        }
    except Exception as e:
        raise e


@router.post("/course/{course_id}/end", response_model=dict)
async def end_course(
    course_id: str,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    local_date: Optional[str] = Query(None, description="Client local date (YYYY-MM-DD) for end date"),
) -> dict:
    """End a treatment course by setting its end_date."""
    try:
        course = await medicine_service.end_course(course_id, current_user.id, local_date)
        return {
            "status": 1,
            "data": course.model_dump(),
            "message": "Treatment course ended successfully",
        }
    except Exception as e:
        raise e


@router.get("/course/list", response_model=dict)
async def list_courses(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    pet_id: str = Query(..., description="Pet ID to list courses for"),
    status: Optional[str] = Query("active", description="Filter: active, ended, or all"),
) -> dict:
    """List treatment courses for a pet."""
    try:
        courses = await medicine_service.list_courses(pet_id, current_user.id, course_status=status)
        return {
            "status": 1,
            "data": [c.model_dump() for c in courses],
            "message": f"Found {len(courses)} treatment courses",
        }
    except Exception as e:
        raise e


# ================== Medication Log ==================


@router.post("/log/create", response_model=dict)
async def create_log(
    request: CreateLogRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """Record a medication administration."""
    try:
        log = await medicine_service.create_log(request, current_user.id)
        return {
            "status": 1,
            "data": log.model_dump(),
            "message": "Medication log recorded successfully",
        }
    except Exception as e:
        raise e


@router.post("/log/{log_id}/delete", response_model=dict)
async def delete_log(
    log_id: str,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """Soft-delete a medication log (undo an administration record)."""
    try:
        result = await medicine_service.delete_log(log_id, current_user.id)
        return {
            "status": 1,
            "data": result,
            "message": "Medication log deleted successfully",
        }
    except Exception as e:
        raise e


# ================== Medication by ID (must be LAST — path param catches all) ==================


@router.post("/{medication_id}/update", response_model=dict)
async def update_medication(
    medication_id: str,
    request: UpdateMedicationRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """Update an existing medication entry."""
    try:
        medication = await medicine_service.update_medication(medication_id, request, current_user.id)
        return {
            "status": 1,
            "data": medication.model_dump(),
            "message": "Medication updated successfully",
        }
    except Exception as e:
        raise e


@router.post("/{medication_id}/delete", response_model=dict)
async def delete_medication(
    medication_id: str,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """Soft-delete a medication entry."""
    try:
        result = await medicine_service.delete_medication(medication_id, current_user.id)
        return {
            "status": 1,
            "data": result,
            "message": "Medication deleted successfully",
        }
    except Exception as e:
        raise e


@router.get("/{medication_id}", response_model=dict)
async def get_medication(
    medication_id: str,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """Get medication details."""
    try:
        medication = await medicine_service.get_medication(medication_id, current_user.id)
        return {
            "status": 1,
            "data": medication.model_dump(),
            "message": "Medication details retrieved successfully",
        }
    except Exception as e:
        raise e
