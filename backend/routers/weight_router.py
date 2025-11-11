from typing import Annotated

from fastapi import APIRouter, Depends

from backend.models.user import UserInfo
from backend.models.weight import CreateWeightRecordRequest, SearchWeightRecordsRequest, UpdateWeightRecordRequest
from backend.services.auth_service import get_current_user
from backend.services.weight_service import WeightService

router = APIRouter(prefix="/weights", tags=["weights"])
weight_service = WeightService()


# ================== CRUD Operations ==================


@router.post("/create", response_model=dict)
async def create_weight_record(
    request: CreateWeightRecordRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """
    Creates a new weight measurement record for a pet.

    Authorization: Creator or Member permissions required for the pet's associated group

    This endpoint records a weight measurement for a pet with optional timestamp
    specification for retroactive record keeping. The record is associated with
    the user who created it for proper attribution and audit trails.

    Key Features:
    - Validates user permissions through group membership (creators and members only)
    - Supports current and retroactive weight recording via timestamp parameter
    - Generates prefixed ID format: wt_{8-char-id} for easy identification
    - Records attribution to track who measured the weight
    - Optional notes for additional context (medication, health conditions, etc.)

    Body:
    - pet_id: ID of the pet being weighed (required)
    - weight: Weight measurement in kilograms (required, 0.1-200)
    - timestamp: When the weight was measured (optional, defaults to current time)
    - notes: Additional measurement notes (optional, max 500 characters)

    Example Use Cases:
    - Regular weight tracking: Just provide pet_id and weight
    - Retroactive entry: Include timestamp for past measurements
    - Medical tracking: Add notes about health conditions or medications

    Returns:
    - Complete weight record details with pet information
    - Generated composite ID for future reference
    - User attribution and timing details
    """
    try:
        weight_details = await weight_service.create_weight_record(request, current_user.id)
        return {
            "status": 1,
            "data": weight_details.model_dump(),
            "message": f"Weight record for {weight_details.pet_id} created successfully",
        }
    except Exception as e:
        raise e


@router.post("/update/{weight_id}", response_model=dict)
async def update_weight_record(
    weight_id: str,
    request: UpdateWeightRecordRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """
    Updates an existing weight measurement record.

    Authorization: Only the user who created the record can update it

    This endpoint allows modification of weight measurements for corrections or
    additional information. Only the original recorder can make changes to
    maintain data integrity and accountability.

    Path Parameters:
    - weight_id: The composite ID of the weight record to update

    Body: (all fields optional, only provided fields will be updated)
    - weight: Updated weight measurement in kg (0.1-200)
    - timestamp: Updated measurement time
    - notes: Updated or additional notes (max 500 characters)

    Permission Requirements:
    - Must be the user who originally created this weight record
    - Even group creators cannot modify others' records

    Use Cases:
    - Correct measurement errors
    - Add additional notes after initial recording
    - Adjust timestamp if recorded at wrong time

    Returns:
    - Updated complete weight record details
    - Updated timestamp reflects when the modification was made
    """
    try:
        weight_details = await weight_service.update_weight_record(weight_id, request, current_user.id)
        return {
            "status": 1,
            "data": weight_details.model_dump(),
            "message": "Weight record updated successfully",
        }
    except Exception as e:
        raise e


@router.post("/delete/{weight_id}", response_model=dict)
async def delete_weight_record(
    weight_id: str,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """
    Soft deletes a weight measurement record.

    Authorization: Only the user who created the record can delete it

    This endpoint performs a soft delete by setting is_active to false,
    preserving the record in the database for audit purposes while
    removing it from normal queries and displays.

    Path Parameters:
    - weight_id: The composite ID of the weight record to delete

    Permission Requirements:
    - Must be the user who originally created this weight record
    - Even group creators cannot delete others' records

    Implementation Note:
    - This is a soft delete (is_active = false)
    - Record remains in database for historical tracking
    - Does not appear in search results or statistics

    Returns:
    - Confirmation of deletion with record ID
    - Deletion status flag
    """
    try:
        result = await weight_service.delete_weight_record(weight_id, current_user.id)
        return {
            "status": 1,
            "data": result,
            "message": "Weight record deleted successfully",
        }
    except Exception as e:
        raise e


@router.get("/info", response_model=dict)
async def get_weight_records_info(
    request: SearchWeightRecordsRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """
    Searches weight measurement records with comprehensive filtering and sorting options.

    Authorization: All group members (including viewers) can search weight records

    This endpoint provides powerful search capabilities for weight tracking analysis,
    supporting various filtering, sorting, and pagination options. Users can only
    access records for pets in groups they belong to.

    Body:
    - pet_id: Filter for specific pet (optional)
    - user_id: Filter by who recorded the weight (optional)
    - start: Start of timestamp range filter (optional)
    - end: End of timestamp range filter (optional)
    - order_by: Field to sort by - "timestamp", "created_at", or "updated_at" (default: "timestamp")
    - order_direction: Sort direction - "asc" or "desc" (default: "desc")
    - page: Page number starting from 1 (default: 1)
    - number: Records per page (default: 50, max: 500)

    Query Scenarios:
    1. Pet weight history: Provide pet_id, sort by timestamp desc
    2. Recent measurements: Use start/end dates, sort by timestamp
    3. User's recordings: Filter by user_id to see who recorded what
    4. All accessible pets: No pet_id filter shows all pets in user's groups

    Sorting Options:
    - timestamp: Sort by actual measurement time (recommended for tracking)
    - created_at: Sort by when record was entered into system
    - updated_at: Sort by last modification time

    Returns:
    - records: Array of weight record information
    - total: Total number of matching records
    - page: Current page number
    - number: Records per page
    - total_pages: Total number of pages available

    Permission Requirements:
    - If pet_id specified: Must have access to that pet's group
    - If no pet_id: Returns records from all accessible pets in user's groups
    - All group roles (creator, member, viewer) can search

    Example Response:
    {
        "status": 1,
        "data": {
            "records": [...],
            "total": 150,
            "page": 1,
            "number": 50,
            "total_pages": 3
        },
        "message": "Found 150 weight records"
    }
    """
    try:
        search_result = await weight_service.search_weight_records(request, current_user.id)
        return {
            "status": 1,
            "data": search_result.model_dump(),
            "message": f"Found {search_result.total} weight records",
        }
    except Exception as e:
        raise e
