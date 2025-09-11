import os
import uuid
from datetime import datetime as dt
from datetime import timezone as tz
from pathlib import Path
from typing import List

import aiofiles
from fastapi import HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from backend.core.database import MongoAsyncClient
from backend.models.group import group_collection
from backend.models.pet import (  # Collections; Models; Request Models; Response Models
    AssignPetToGroupRequest,
    CreatePetRequest,
    GroupAssignmentInfo,
    Pet,
    PetDetails,
    PetInfo,
    PetPhoto,
    PetPhotoInfo,
    UpdatePetRequest,
    pet_collection,
    pet_photo_collection,
)
from backend.models.user import user_collection
from backend.services.group_service import GroupService


class PetService:
    """
    PetService handles all pet-related business logic following the individual
    ownership + group assignment model specified in the API documentation.

    Key Principles:
    - Individual Ownership: Each pet is owned by the user who created it
    - Single Group Assignment: Each pet can only be assigned to one group at a time
    - Permission-Based Access: Access controlled through group membership roles
    """

    def __init__(self):
        self.db = MongoAsyncClient()
        self.group_service = GroupService()
        self.photo_storage_path = "backend/storage/pet_photos"

        # Ensure photo storage directory exists
        os.makedirs(self.photo_storage_path, exist_ok=True)

    # ================== Permission Helpers ==================

    async def _get_user_pet_permission(self, pet_id: str, user_id: str) -> tuple[Pet, str]:
        """
        Determine user's permission level for a specific pet.

        Args:
            pet_id: Target pet ID
            user_id: User requesting access

        Returns:
            tuple[Pet, str]: Pet object and permission level ("owner", "creator", "member", "viewer", "none")

        Raises:
            HTTPException: If pet not found or user has no access
        """
        # Get pet information
        pet_dict = await self.db.find_one(pet_collection, {"id": pet_id, "is_active": True})
        if not pet_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")

        pet = Pet(**pet_dict)

        # Owner has full permissions
        if pet.owner_id == user_id:
            return pet, "owner"

        # If pet not assigned to any group, only owner can access
        if not pet.group_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to access this pet"
            )

        # Check group membership and role
        try:
            group_dict = await self.db.find_one(group_collection, {"id": pet.group_id, "is_active": True})
            if not group_dict:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet's group not found")

            # Check if user is in group's member list
            if user_id not in group_dict.get("member_ids", []):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to access this pet"
                )

            # Determine role within group
            if group_dict["creator_id"] == user_id:
                return pet, "creator"
            else:
                # For now, all non-creator members have "member" permission
                # Future: could add viewer role logic here
                return pet, "member"

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error checking pet permissions"
            )

    async def _can_modify_pet(self, pet: Pet, user_id: str, permission: str) -> bool:
        """Check if user can modify pet based on ownership and permission level"""
        return pet.owner_id == user_id or permission in ["owner", "creator"]

    async def _can_view_pet(self, permission: str) -> bool:
        """Check if user can view pet based on permission level"""
        return permission in ["owner", "creator", "member", "viewer"]

    # ================== Core Pet Management ==================

    async def create_pet(self, request: CreatePetRequest, owner_id: str) -> PetDetails:
        """
        Create a new pet owned by the user.
        Pet is initially not assigned to any group (personal pet).

        Args:
            request: Pet creation details
            owner_id: User ID of the pet owner

        Returns:
            PetDetails: Created pet information
        """
        # Generate pet ID and timestamps
        pet_id = str(uuid.uuid4())[:8]
        current_time = int(dt.now(tz.utc).timestamp())

        # Create pet
        pet = Pet(
            id=pet_id,
            name=request.name,
            pet_type=request.pet_type,
            breed=request.breed,
            gender=request.gender,
            birth_date=request.birth_date,
            current_weight_kg=request.current_weight_kg,
            target_weight_kg=request.target_weight_kg,
            height_cm=request.height_cm,
            is_spayed=request.is_spayed,
            microchip_id=request.microchip_id,
            daily_calorie_target=request.daily_calorie_target,
            owner_id=owner_id,
            group_id=None,  # Initially not assigned to any group
            created_at=current_time,
            updated_at=current_time,
            is_active=True,
            notes=request.notes,
        )

        # Save to database
        await self.db.insert_one(pet_collection, pet.model_dump())

        # Get owner info for response
        owner_dict = await self.db.find_one(user_collection, {"id": owner_id})
        owner_name = owner_dict["name"] if owner_dict else "Unknown"

        # Calculate age if birth date provided
        age_months = None
        if pet.birth_date:
            birth_dt = dt.fromtimestamp(pet.birth_date, tz.utc)
            current_dt = dt.now(tz.utc)
            age_months = int((current_dt - birth_dt).days / 30.44)  # Average days per month

        return PetDetails(
            id=pet.id,
            name=pet.name,
            pet_type=pet.pet_type,
            breed=pet.breed,
            gender=pet.gender,
            birth_date=pet.birth_date,
            age_months=age_months,
            current_weight_kg=pet.current_weight_kg,
            target_weight_kg=pet.target_weight_kg,
            height_cm=pet.height_cm,
            is_spayed=pet.is_spayed,
            microchip_id=pet.microchip_id,
            daily_calorie_target=pet.daily_calorie_target,
            owner_id=pet.owner_id,
            owner_name=owner_name,
            group_id=pet.group_id,
            current_group_name=None,
            created_at=pet.created_at,
            updated_at=pet.updated_at,
            notes=pet.notes,
            is_owned_by_user=True,
            user_permission="owner",
        )

    async def get_accessible_pets(self, user_id: str) -> List[PetInfo]:
        """
        Get all pets the user can access across all groups they belong to,
        plus their own pets not assigned to any group.

        Args:
            user_id: User ID to get accessible pets for

        Returns:
            List[PetInfo]: List of accessible pets with permission context
        """
        accessible_pets = []

        # Get user's own pets (including unassigned ones)
        owned_pets = await self.db.db[pet_collection].find({"owner_id": user_id, "is_active": True}).to_list(None)

        for pet_dict in owned_pets:
            pet = Pet(**pet_dict)

            # Get group info if assigned
            group_name = None
            if pet.group_id:
                group_dict = await self.db.find_one(group_collection, {"id": pet.group_id})
                group_name = group_dict["name"] if group_dict else None

            # Get owner name
            owner_dict = await self.db.find_one(user_collection, {"id": pet.owner_id})
            owner_name = owner_dict["name"] if owner_dict else "Unknown"

            accessible_pets.append(
                PetInfo(
                    id=pet.id,
                    name=pet.name,
                    pet_type=pet.pet_type,
                    breed=pet.breed,
                    gender=pet.gender,
                    current_weight_kg=pet.current_weight_kg,
                    owner_id=pet.owner_id,
                    owner_name=owner_name,
                    group_id=pet.group_id,
                    current_group_name=group_name,
                    created_at=pet.created_at,
                    is_owned_by_user=True,
                    user_permission="owner",
                )
            )

        # Get pets from groups user belongs to (excluding own pets)
        user_groups = await self.group_service.get_user_groups(user_id)

        for group_info in user_groups:
            # Get group details to find member pets
            group_dict = await self.db.find_one(group_collection, {"id": group_info.id})
            if not group_dict:
                continue

            # Find pets assigned to this group (excluding user's own pets)
            group_pets = (
                await self.db.db[pet_collection]
                .find(
                    {
                        "group_id": group_info.id,
                        "owner_id": {"$ne": user_id},  # Exclude own pets (already added above)
                        "is_active": True,
                    }
                )
                .to_list(None)
            )

            for pet_dict in group_pets:
                pet = Pet(**pet_dict)

                # Get owner name
                owner_dict = await self.db.find_one(user_collection, {"id": pet.owner_id})
                owner_name = owner_dict["name"] if owner_dict else "Unknown"

                # Determine permission level
                permission = "creator" if group_dict["creator_id"] == user_id else "member"

                accessible_pets.append(
                    PetInfo(
                        id=pet.id,
                        name=pet.name,
                        pet_type=pet.pet_type,
                        breed=pet.breed,
                        gender=pet.gender,
                        current_weight_kg=pet.current_weight_kg,
                        owner_id=pet.owner_id,
                        owner_name=owner_name,
                        group_id=pet.group_id,
                        current_group_name=group_info.name,
                        created_at=pet.created_at,
                        is_owned_by_user=False,
                        user_permission=permission,
                    )
                )

        # Sort by creation date (newest first)
        accessible_pets.sort(key=lambda p: p.created_at, reverse=True)

        return accessible_pets

    async def get_pet_details(self, pet_id: str, user_id: str) -> PetDetails:
        """
        Get comprehensive pet information including activity summaries.

        Args:
            pet_id: Pet ID to get details for
            user_id: User requesting the information

        Returns:
            PetDetails: Comprehensive pet information
        """
        # Check permissions and get pet
        pet, permission = await self._get_user_pet_permission(pet_id, user_id)

        if not await self._can_view_pet(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to view this pet"
            )

        # Get owner and group information
        owner_dict = await self.db.find_one(user_collection, {"id": pet.owner_id})
        owner_name = owner_dict["name"] if owner_dict else "Unknown"

        group_name = None
        if pet.group_id:
            group_dict = await self.db.find_one(group_collection, {"id": pet.group_id})
            group_name = group_dict["name"] if group_dict else None

        # Calculate age if birth date provided
        age_months = None
        if pet.birth_date:
            birth_dt = dt.fromtimestamp(pet.birth_date, tz.utc)
            current_dt = dt.now(tz.utc)
            age_months = int((current_dt - birth_dt).days / 30.44)

        return PetDetails(
            id=pet.id,
            name=pet.name,
            pet_type=pet.pet_type,
            breed=pet.breed,
            gender=pet.gender,
            birth_date=pet.birth_date,
            age_months=age_months,
            current_weight_kg=pet.current_weight_kg,
            target_weight_kg=pet.target_weight_kg,
            height_cm=pet.height_cm,
            is_spayed=pet.is_spayed,
            microchip_id=pet.microchip_id,
            daily_calorie_target=pet.daily_calorie_target,
            owner_id=pet.owner_id,
            owner_name=owner_name,
            group_id=pet.group_id,
            current_group_name=group_name,
            created_at=pet.created_at,
            updated_at=pet.updated_at,
            notes=pet.notes,
            is_owned_by_user=(pet.owner_id == user_id),
            user_permission=permission,
        )

    async def update_pet(self, pet_id: str, request: UpdatePetRequest, user_id: str) -> PetDetails:
        """
        Update pet information. Only owners can modify pet details.

        Args:
            pet_id: Pet to update
            request: Update details
            user_id: User requesting the update

        Returns:
            PetDetails: Updated pet information
        """
        # Check permissions and get pet
        pet, permission = await self._get_user_pet_permission(pet_id, user_id)

        if not await self._can_modify_pet(pet, user_id, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Only pet owners can modify pet information"
            )

        # Prepare update data
        update_data = {"updated_at": int(dt.now(tz.utc).timestamp())}

        # Update only provided fields
        if request.name is not None:
            update_data["name"] = request.name
        if request.breed is not None:
            update_data["breed"] = request.breed
        if request.gender is not None:
            update_data["gender"] = request.gender.value
        if request.birth_date is not None:
            update_data["birth_date"] = request.birth_date
        if request.current_weight_kg is not None:
            update_data["current_weight_kg"] = request.current_weight_kg
        if request.target_weight_kg is not None:
            update_data["target_weight_kg"] = request.target_weight_kg
        if request.height_cm is not None:
            update_data["height_cm"] = request.height_cm
        if request.is_spayed is not None:
            update_data["is_spayed"] = request.is_spayed
        if request.microchip_id is not None:
            update_data["microchip_id"] = request.microchip_id
        if request.daily_calorie_target is not None:
            update_data["daily_calorie_target"] = request.daily_calorie_target
        if request.notes is not None:
            update_data["notes"] = request.notes

        # Update pet
        await self.db.update_one(pet_collection, {"id": pet_id}, update_data)

        # Return updated pet details
        return await self.get_pet_details(pet_id, user_id)

    async def delete_pet(self, pet_id: str, user_id: str) -> dict:
        """
        Soft delete a pet. Only owners can delete their pets.

        Args:
            pet_id: Pet to delete
            user_id: User requesting the deletion

        Returns:
            dict: Success confirmation
        """
        # Check permissions and get pet
        pet, permission = await self._get_user_pet_permission(pet_id, user_id)

        if pet.owner_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only pet owners can delete their pets")

        # Soft delete pet
        await self.db.update_one(
            pet_collection,
            {"id": pet_id},
            {
                "is_active": False,
                "updated_at": int(dt.now(tz.utc).timestamp()),
                "group_id": None,  # Remove from group assignment
            },
        )

        return {"message": f"Pet '{pet.name}' has been deleted successfully"}

    # ================== Group Assignment Management ==================

    async def assign_pet_to_group(
        self, pet_id: str, request: AssignPetToGroupRequest, user_id: str
    ) -> GroupAssignmentInfo:
        """
        Assign pet to a different group. Only pet owners can reassign pets,
        and they must be a creator of the target group.

        Args:
            pet_id: Pet to assign
            request: Target group details
            user_id: User making the request

        Returns:
            GroupAssignmentInfo: Updated assignment information
        """
        # Check pet ownership
        pet, permission = await self._get_user_pet_permission(pet_id, user_id)

        if pet.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Only pet owners can assign pets to groups"
            )

        # Validate target group and user's creator role
        target_group_dict = await self.db.find_one(group_collection, {"id": request.target_group_id, "is_active": True})

        if not target_group_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target group not found")

        # Check if user is creator of target group
        if target_group_dict["creator_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be the creator of the target group to assign pets to it",
            )

        # Update pet's group assignment
        current_time = int(dt.now(tz.utc).timestamp())
        await self.db.update_one(
            pet_collection, {"id": pet_id}, {"group_id": request.target_group_id, "updated_at": current_time}
        )

        return GroupAssignmentInfo(
            pet_id=pet.id,
            pet_name=pet.name,
            group_id=request.target_group_id,
            current_group_name=target_group_dict["name"],
            member_count=len(target_group_dict.get("member_ids", [])),
            user_role_in_group="creator",
            assigned_at=current_time,
        )

    async def get_pet_current_group(self, pet_id: str, user_id: str) -> GroupAssignmentInfo:
        """
        Get information about pet's current group assignment.

        Args:
            pet_id: Pet ID
            user_id: User requesting the information

        Returns:
            GroupAssignmentInfo: Current assignment information
        """
        # Check permissions and get pet
        pet, permission = await self._get_user_pet_permission(pet_id, user_id)

        if not await self._can_view_pet(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to view this pet"
            )

        # Get group information if assigned
        group_name = None
        member_count = None
        user_role = None

        if pet.group_id:
            group_dict = await self.db.find_one(group_collection, {"id": pet.group_id})
            if group_dict:
                group_name = group_dict["name"]
                member_count = len(group_dict.get("member_ids", []))
                user_role = "creator" if group_dict["creator_id"] == user_id else "member"

        return GroupAssignmentInfo(
            pet_id=pet.id,
            pet_name=pet.name,
            group_id=pet.group_id,
            current_group_name=group_name,
            member_count=member_count,
            user_role_in_group=user_role,
            assigned_at=None,  # Would need to track assignment history to provide this
        )

    # ================== Group-Based Pet Viewing ==================

    # ================== Photo Management ==================

    async def upload_pet_photo(self, pet_id: str, file: UploadFile, user_id: str) -> PetPhotoInfo:
        """
        Upload or update a photo for a pet. Only owners can upload photos.

        Args:
            pet_id: Pet to upload photo for
            file: Photo file upload
            user_id: User uploading the photo

        Returns:
            PetPhotoInfo: Photo information
        """
        # Check permissions and get pet
        pet, permission = await self._get_user_pet_permission(pet_id, user_id)

        if pet.owner_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only pet owners can upload photos")

        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed")

        # Validate file size (max 10MB)
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size must be less than 10MB")

        # Generate unique photo ID and file path
        file_extension = Path(file.filename).suffix if file.filename else ".jpg"
        filename = f"{pet_id}{file_extension}"
        file_path = os.path.join(self.photo_storage_path, filename)

        try:
            # Save file to storage
            async with aiofiles.open(file_path, "wb") as f:
                content = await file.read()
                await f.write(content)

            # Get file size
            file_size = len(content)

            await self._remove_old_photo(pet.id)

            # Create photo record
            photo = PetPhoto(
                pet_id=pet_id,
                filename=file.filename or f"pet_photo{file_extension}",
                file_path=file_path,
                file_size=file_size,
                content_type=file.content_type,
                uploaded_by=user_id,
                uploaded_at=int(dt.now(tz.utc).timestamp()),
                is_active=True,
            )

            # Save photo record
            await self.db.insert_one(pet_photo_collection, photo.model_dump())

            # Update pet with photo reference
            await self.db.update_one(pet_collection, {"id": pet_id}, {"updated_at": int(dt.now(tz.utc).timestamp())})

            # Get uploader name
            uploader_dict = await self.db.find_one(user_collection, {"id": user_id})
            uploader_name = uploader_dict["name"] if uploader_dict else "Unknown"

            return PetPhotoInfo(
                pet_id=photo.pet_id,
                filename=photo.filename,
                file_size=photo.file_size,
                content_type=photo.content_type,
                uploaded_by=photo.uploaded_by,
                uploaded_by_name=uploader_name,
                uploaded_at=photo.uploaded_at,
            )

        except Exception as e:
            # Clean up file if database operation fails
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to upload photo: {str(e)}"
            )

    async def get_pet_photo(self, pet_id: str, user_id: str) -> FileResponse:
        """
        Get pet photo file. User must have access to the pet to view its photo.

        Args:
            pet_id: Pet ID to retrieve
            user_id: User requesting the photo

        Returns:
            FileResponse: Photo file response
        """
        # Get photo record
        photo_dict = await self.db.find_one(pet_photo_collection, {"id": pet_id, "is_active": True})
        if not photo_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

        photo = PetPhoto(**photo_dict)

        # Check pet access permissions
        try:
            pet, permission = await self._get_user_pet_permission(photo.pet_id, user_id)

            if not await self._can_view_pet(permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to view this photo"
                )
        except HTTPException:
            raise

        # Check if file exists
        if not os.path.exists(photo.file_path):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo file not found")

        return FileResponse(
            path=photo.file_path,
            media_type=photo.content_type,
            filename=photo.filename,
            headers={"Cache-Control": "public, max-age=3600"},  # 1 hour cache
        )

    async def delete_pet_photo(self, pet_id: str, user_id: str) -> dict:
        """
        Delete pet photo. Only owners can delete photos.

        Args:
            pet_id: Pet to delete photo from
            user_id: User requesting the deletion

        Returns:
            dict: Success confirmation
        """
        # Check permissions and get pet
        pet, permission = await self._get_user_pet_permission(pet_id, user_id)

        if pet.owner_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only pet owners can delete photos")

        # Remove photo
        await self._remove_old_photo(pet.id)

        # Update pet to remove photo reference
        await self.db.update_one(pet_collection, {"id": pet_id}, {"updated_at": int(dt.now(tz.utc).timestamp())})

        return {"message": f"Photo for pet '{pet.name}' has been deleted successfully"}

    async def _remove_old_photo(self, pet_id: str):
        """Helper method to remove old photo files and records"""
        try:
            # Get photo record
            photo_dict = await self.db.find_one(pet_photo_collection, {"id": pet_id})
            if photo_dict:
                photo = PetPhoto(**photo_dict)

                # Remove file if exists
                if os.path.exists(photo.file_path):
                    os.remove(photo.file_path)

                # Mark photo as inactive
                await self.db.delete_one(pet_photo_collection, {"id": pet_id})
        except Exception:
            # Don't fail the main operation if cleanup fails
            pass
