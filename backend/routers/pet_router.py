from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse

from backend.models.pet import AssignPetToGroupRequest, CreatePetRequest, UpdatePetRequest
from backend.models.user import UserInfo
from backend.services.auth_service import get_current_user
from backend.services.pet_service import PetService

router = APIRouter(prefix="/pets", tags=["pets"])
pet_service = PetService()


# ================== Pet Creation and Basic Management ==================


@router.post("/", response_model=dict)
async def create_pet(request: CreatePetRequest, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Creates a new pet owned by the authenticated user.

    The pet is initially not assigned to any group and remains as a personal pet
    until explicitly assigned to a group by the owner.

    Body:
    - name: Pet name (1-50 characters, required)
    - pet_type: Type of pet (dog/cat/bird/fish/rabbit/hamster/reptile/other, required)
    - breed: Pet breed (optional, max 100 characters)
    - gender: Pet gender (male/female/unknown, default: unknown)
    - birth_date: Birth date as Unix timestamp (optional)
    - current_weight_kg: Current weight in kg (optional, 0.1-200)
    - target_weight_kg: Target weight in kg (optional, 0.1-200)
    - height_cm: Height in cm (optional, 1-200)
    - is_spayed: Spay/neuter status (optional boolean)
    - microchip_id: Microchip ID (optional, max 50 characters)
    - daily_calorie_target: Daily calorie goal (optional, 50-5000)
    - notes: Additional notes (optional, max 1000 characters)

    Returns:
    - Created pet details with generated ID and ownership information

    Example:
    POST /pets
    {
        "name": "Buddy",
        "pet_type": "dog",
        "breed": "Golden Retriever",
        "current_weight_kg": 25.5,
        "target_weight_kg": 23.0
    }
    """
    try:
        pet_details = await pet_service.create_pet(request, current_user.id)
        return {
            "status": 1,
            "data": pet_details.model_dump(),
            "message": f"Pet '{pet_details.name}' created successfully",
        }
    except Exception as e:
        raise e


@router.get("/accessible", response_model=dict)
async def get_accessible_pets(current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Retrieves all pets the current user can access across all groups they belong to,
    including their own pets regardless of group assignment.

    Returns pets from:
    - User's own pets (all personal and assigned pets)
    - Pets in groups where user is a member (with appropriate permission levels)

    Each pet includes permission context to help UI determine available actions.

    Returns:
    - List of accessible pets with ownership and permission information
    - Each pet shows: basic info, owner details, group assignment, permission level

    Permission levels:
    - "owner": User owns the pet (full permissions)
    - "creator": User is creator of pet's group (can view/record data)
    - "member": User is member of pet's group (can view/record data)
    - "viewer": User is viewer of pet's group (read-only access)

    Example response:
    {
        "status": 1,
        "data": [
            {
                "id": "pet123",
                "name": "Buddy",
                "pet_type": "dog",
                "owner_name": "John Smith",
                "current_group_name": "Smith Family Pets",
                "user_permission": "owner",
                "is_owned_by_user": true
            }
        ],
        "message": "Found 3 accessible pets"
    }
    """
    try:
        pets = await pet_service.get_accessible_pets(current_user.id)
        return {
            "status": 1,
            "data": [pet.model_dump() for pet in pets],
            "message": f"Found {len(pets)} accessible pets",
        }
    except Exception as e:
        raise e


@router.post("/{pet_id}/update", response_model=dict)
async def update_pet_information(
    pet_id: str, request: UpdatePetRequest, current_user: Annotated[UserInfo, Depends(get_current_user)]
) -> dict:
    """
    Updates pet information. Only pet owners can modify their pets.

    Allows partial updates - only provided fields will be modified.
    All fields are optional in the update request.

    Authorization: Pet ownership required

    Body: (all fields optional)
    - name: New pet name (1-50 characters)
    - breed: New breed (max 100 characters)
    - gender: New gender (male/female/unknown)
    - birth_date: New birth date as Unix timestamp
    - current_weight_kg: New current weight (0.1-200)
    - target_weight_kg: New target weight (0.1-200)
    - height_cm: New height in cm (1-200)
    - is_spayed: New spay/neuter status
    - microchip_id: New microchip ID (max 50 characters)
    - daily_calorie_target: New calorie target (50-5000)
    - notes: Updated notes (max 1000 characters)

    Returns:
    - Updated complete pet details

    Example:
    POST /pets/pet123/update
    {
        "current_weight_kg": 24.2,
        "notes": "Lost 1.3kg this month, great progress!"
    }
    """
    try:
        pet_details = await pet_service.update_pet(pet_id, request, current_user.id)
        return {
            "status": 1,
            "data": pet_details.model_dump(),
            "message": f"Pet '{pet_details.name}' updated successfully",
        }
    except Exception as e:
        raise e


@router.post("/{pet_id}/delete", response_model=dict)
async def delete_pet(pet_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Performs soft deletion of a pet, removing it from active use while preserving
    historical data and records.

    Authorization: Pet ownership required

    The pet will be:
    - Marked as inactive (soft deletion)
    - Removed from current group assignment
    - Hidden from active pet lists
    - Historical data preserved for record keeping

    Returns:
    - Success confirmation with pet name

    Example:
    POST /pets/pet123/delete
    Response:
    {
        "status": 1,
        "data": {"message": "Pet 'Buddy' has been deleted successfully"},
        "message": "Pet deleted successfully"
    }
    """
    try:
        result = await pet_service.delete_pet(pet_id, current_user.id)
        return {"status": 1, "data": result, "message": "Pet deleted successfully"}
    except Exception as e:
        raise e


# ================== Group Assignment Management ==================


@router.post("/{pet_id}/assign-group", response_model=dict)
async def assign_pet_to_group(
    pet_id: str, request: AssignPetToGroupRequest, current_user: Annotated[UserInfo, Depends(get_current_user)]
) -> dict:
    """
    Moves a pet from its current assignment to a different group.

    Authorization: Requires pet ownership AND creator-level access to target group

    This enables collaborative care scenarios by allowing pet owners to share
    their pets with family or care teams while maintaining ownership.

    Validation:
    - User must own the pet being moved
    - User must be creator of the target group
    - Target group must exist and be active

    The operation atomically:
    - Removes pet from current group (if any)
    - Assigns pet to new group
    - Updates assignment timestamps

    Body:
    - target_group_id: ID of group to assign pet to (required)

    Returns:
    - Updated group assignment information
    - Group details and user's role context

    Example:
    POST /pets/pet123/assign-group
    {
        "target_group_id": "grp456"
    }
    """
    try:
        assignment_info = await pet_service.assign_pet_to_group(pet_id, request, current_user.id)
        return {
            "status": 1,
            "data": assignment_info.model_dump(),
            "message": f"Pet '{assignment_info.pet_name}' assigned to group '{assignment_info.current_group_name}'",
        }
    except Exception as e:
        raise e


@router.get("/{pet_id}/current-group", response_model=dict)
async def get_pet_current_group(pet_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Provides information about the group where a pet is currently assigned.

    Authorization: Pet access required (owner, or member of pet's group)

    Returns details about:
    - Current group assignment (if any)
    - User's role within that group
    - Group member count and context
    - Assignment timing information

    Helps users understand:
    - Where they can collaborate on pet care
    - Their permission level for pet operations
    - Group context for care coordination

    Returns:
    - Group assignment details
    - User's role and permissions context
    - null values if pet not assigned to any group

    Example response:
    {
        "status": 1,
        "data": {
            "pet_id": "pet123",
            "pet_name": "Buddy",
            "group_id": "grp456",
            "current_group_name": "Smith Family Pets",
            "member_count": 4,
            "user_role_in_group": "member"
        }
    }
    """
    try:
        assignment_info = await pet_service.get_pet_current_group(pet_id, current_user.id)
        return {"status": 1, "data": assignment_info.model_dump(), "message": "Group assignment information retrieved"}
    except Exception as e:
        raise e


# ================== Detailed Pet Information ==================


@router.get("/{pet_id}/details", response_model=dict)
async def get_pet_details(pet_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Returns comprehensive pet information combining static profile data
    with context about ownership and permissions.

    Authorization: Pet access required (owner, or member of pet's group)

    Provides complete pet profile including:
    - Basic information (name, type, breed, physical characteristics)
    - Health information (medical conditions, spay/neuter status)
    - Care preferences (activity level, feeding schedule, calorie targets)
    - Ownership and group assignment details
    - User's permission level and available actions
    - Photo reference for visual identification

    The response adapts based on user permission level:
    - Owners see all information
    - Group members see care-relevant information
    - Viewers see basic information only

    Future expansion will include:
    - 7-day activity summary (feeding, weight, medicine records)
    - Health statistics and goal achievement metrics
    - Recent care providers and activity patterns

    Returns:
    - Complete pet profile with permission context
    - Calculated fields like age from birth date
    - User's relationship to pet (owner/member/viewer)

    Example response shows comprehensive pet data with user context.
    """
    try:
        pet_details = await pet_service.get_pet_details(pet_id, current_user.id)
        return {
            "status": 1,
            "data": pet_details.model_dump(),
            "message": f"Details for pet '{pet_details.name}' retrieved successfully",
        }
    except Exception as e:
        raise e


# ================== Photo Management ==================


@router.post("/{pet_id}/photo", response_model=dict)
async def upload_pet_photo(
    pet_id: str,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    file: UploadFile = File(..., description="Pet photo image file"),
) -> dict:
    """
    Uploads or replaces a pet's photo for visual identification.

    Authorization: Pet ownership required

    File Requirements:
    - Image files only (JPEG, PNG, GIF, WebP)
    - Maximum size: 10MB
    - Single photo per pet (replaces existing if present)

    The system:
    - Stores photos securely in local backend storage
    - Generates unique photo identifiers
    - Removes old photos when uploading new ones
    - Validates file format and size
    - Updates pet record with photo reference

    Storage:
    - Files saved with unique names to prevent conflicts
    - Original filename preserved for user reference
    - Metadata stored for access control and cleanup

    Returns:
    - Photo information including ID for future reference
    - File metadata (size, type, upload timestamp)
    - Uploader information

    Example:
    POST /pets/pet123/photo
    Content-Type: multipart/form-data
    [file upload]

    Response includes photo ID for use in GET /photos/{pet_id}
    """
    try:
        photo_info = await pet_service.upload_pet_photo(pet_id, file, current_user.id)
        return {"status": 1, "data": photo_info.model_dump(), "message": "Photo uploaded successfully for pet"}
    except Exception as e:
        raise e


@router.get("/photos/{pet_id}", response_class=FileResponse)
async def get_pet_photo(pet_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]):
    """
    Serves pet photos with permission-controlled access.

    Authorization: Pet access required (owner, or member of pet's group)

    Security:
    - Validates user has permission to view the associated pet
    - Prevents unauthorized access to pet photos
    - Returns 404 for non-existent or inaccessible photos

    Performance:
    - Includes HTTP caching headers for browser optimization
    - Serves files directly from local storage
    - Proper MIME type detection for browser compatibility

    Response:
    - Direct image file response
    - Proper content headers for browser display
    - Cache-Control headers for performance (1 hour cache)

    Error cases:
    - 404: Photo not found or user lacks pet access
    - 403: User doesn't have permission to view pet

    Example:
    GET /photos/photo123
    Returns: Direct image file with appropriate headers
    """
    try:
        return await pet_service.get_pet_photo(pet_id, current_user.id)
    except Exception as e:
        raise e


@router.post("/{pet_id}/photo/delete", response_model=dict)
async def delete_pet_photo(pet_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Removes the photo associated with a pet.

    Authorization: Pet ownership required

    The operation:
    - Removes photo file from storage system
    - Updates pet record to clear photo reference
    - Marks photo record as inactive
    - Handles cleanup gracefully if no photo exists

    Cleanup:
    - Physical file deletion from storage
    - Database record deactivation
    - Pet record photo reference removal
    - System maintains cleanliness by removing unused files

    Returns:
    - Success confirmation with pet context
    - Handles cases where no photo exists gracefully

    Example:
    POST /pets/pet123/photo/delete
    Response:
    {
        "status": 1,
        "data": {"message": "Photo for pet 'Buddy' has been deleted successfully"},
        "message": "Photo deleted successfully"
    }
    """
    try:
        result = await pet_service.delete_pet_photo(pet_id, current_user.id)
        return {"status": 1, "data": result, "message": "Photo deleted successfully"}
    except Exception as e:
        raise e


# ================== Group-Based Pet Viewing ==================
# Note: Group-based pet viewing is implemented in group_router.py as GET /groups/{group_id}/pets
# This maintains proper REST resource organization and single-service dependency per router.
