from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile

from backend.models.pet import AssignPetToGroupRequest, CreatePetRequest, UpdatePetRequest
from backend.models.user import UserInfo
from backend.services.auth_service import get_current_user
from backend.services.pet_service import PetService

router = APIRouter(prefix="/pets", tags=["pets"])
pet_service = PetService()


# ================== Pet Creation and Basic Management ==================


@router.post("/create", response_model=dict)
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
    """
    try:
        pets = await pet_service.get_accessible_pets(current_user.id)
        return {
            "status": 1,
            "data": [pet.model_dump() for pet in pets] if pets else [],
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
    """
    try:
        result = await pet_service.delete_pet(pet_id, current_user.id)
        return {"status": 1, "data": result, "message": "Pet deleted successfully"}
    except Exception as e:
        raise e


# ================== Group Assignment Management ==================


@router.post("/{pet_id}/assign_group", response_model=dict)
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
    - group_id: ID of group to assign pet to (required)

    Returns:
    - Updated group assignment information
    - Group details and user's role context
    """
    try:
        assignment_info = await pet_service.assign_pet_to_group(pet_id, request, current_user.id)
        return {
            "status": 1,
            "data": assignment_info.model_dump(),
            "message": f"Pet '{assignment_info.pet_name}' assigned to group '{assignment_info.group_name}'",
        }
    except Exception as e:
        raise e


@router.get("/{pet_id}/current_group", response_model=dict)
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


@router.post("/{pet_id}/photo/upload", response_model=dict)
async def upload_pet_photo(
    pet_id: str,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    file: UploadFile = File(..., description="Pet photo image file (JPEG, PNG, GIF, WebP)"),
) -> dict:
    """
    Uploads or replaces a pet's photo via Cloudinary for visual identification.

    Authorization: Pet ownership required

    File Requirements:
    - Image files only (JPEG, PNG, GIF, WebP)
    - Maximum size: 10MB
    - Single photo per pet (replaces existing if present)

    The system:
    - Stores photos in Cloudinary under petcare/pet_photos/<pet_id>
    - Overwrites the existing asset on re-upload (CDN cache invalidated)
    - Validates file size before upload
    - Updates the pets.photo_url column with the Cloudinary secure URL

    Returns:
    - Photo information including the Cloudinary secure URL
    - File metadata (size, type, upload timestamp)
    """
    try:
        upload_info = await pet_service.upload_pet_photo(pet_id, file, current_user.id)
        return {"status": 1, "data": upload_info, "message": "Photo uploaded successfully for pet"}
    except Exception as e:
        raise e
