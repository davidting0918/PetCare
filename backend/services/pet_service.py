import uuid
from datetime import datetime as dt
from datetime import timezone as tz
from typing import List

from fastapi import HTTPException, UploadFile, status

from backend.core.cloudinary_client import upload_image
from backend.core.db_manager import get_db
from backend.models.pet import (  # Tables; Models; Request Models; Response Models
    AssignPetToGroupRequest,
    CreatePetRequest,
    GroupAssignmentInfo,
    Pet,
    PetDetails,
    PetInfo,
    UpdatePetRequest,
    pet_table,
)
from backend.models.user import user_table
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
        self.group_service = GroupService()

    @property
    def db(self):
        """Get database client from global manager"""
        return get_db()

    # ================== Permission Helpers ==================

    async def _get_user_pet_permission(self, pet_id: str, user_id: str) -> str:
        """
        Determine user's permission level for a specific pet in a single query.

        Combines pet existence check and group membership permission lookup
        into one JOIN query using parameterized inputs.

        Returns:
            str: Permission level ("owner", "creator", "member", "viewer")

        Raises:
            HTTPException: 404 if pet not found, 403 if user has no access
        """
        sql = """
        SELECT
            p.id,
            CASE WHEN p.owner_id = $2 THEN 'owner' ELSE gm.role END AS user_permission
        FROM pets p
        LEFT JOIN group_members gm
            ON gm.group_id = p.group_id
            AND gm.user_id = $2
            AND gm.is_active = TRUE
        WHERE p.id = $1 AND p.is_active = TRUE
        """
        result = await self.db.read_one(sql, pet_id, user_id)
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
        if not result["user_permission"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="User doesn't have permission to this pet"
            )
        return result["user_permission"]

    async def _is_owner(self, pet_id: str, user_id: str) -> bool:
        permission = await self._get_user_pet_permission(pet_id, user_id)
        return permission in ["owner"]

    async def _can_modify_pet(self, pet_id: str, user_id: str) -> bool:
        permission = await self._get_user_pet_permission(pet_id, user_id)
        return permission in ["owner", "creator", "member"]

    async def _can_view_pet(self, pet_id: str, user_id: str) -> bool:
        permission = await self._get_user_pet_permission(pet_id, user_id)
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
        current_time = dt.now(tz.utc)

        # get user info
        sql = f"""
        select * from {user_table} where id = '{owner_id}'
        """
        owner_dict = await self.db.read_one(sql)
        if not owner_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")

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
            group_id=owner_dict["personal_group_id"],
            created_at=current_time,
            updated_at=current_time,
            is_active=True,
            notes=request.notes,
        )

        # Save to database
        await self.db.insert_one(pet_table, pet.model_dump())
        return PetDetails(
            id=pet.id,
            name=pet.name,
            pet_type=pet.pet_type,
            breed=pet.breed,
            gender=pet.gender,
            birth_date=pet.birth_date,
            age=pet.age,
            current_weight_kg=pet.current_weight_kg,
            target_weight_kg=pet.target_weight_kg,
            height_cm=pet.height_cm,
            is_spayed=pet.is_spayed,
            microchip_id=pet.microchip_id,
            daily_calorie_target=pet.daily_calorie_target,
            owner_id=pet.owner_id,
            owner_name=owner_dict["name"],
            group_id=pet.group_id,
            group_name=owner_dict["name"],
            created_at=pet.created_at,
            updated_at=pet.updated_at,
            is_active=pet.is_active,
            notes=pet.notes,
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

        sql = f"""
        select
            p.*,
            g.name as group_name,
            u.name as owner_name,
            gm.role as user_permission
        from group_members gm
        left join groups g on (gm.group_id = g.id)
        left join pets p using (group_id)
        left join users u on (p.owner_id = u.id)
        where
            gm.user_id = '{user_id}'
            and gm.is_active = true
            and p.is_active = true
            and g.is_active = true
        """
        # get all accessible pets
        pets = await self.db.read(sql)
        if not pets:
            return []
        pets = [PetInfo(**pet) for pet in pets]

        # Sort by creation date (newest first)
        pets.sort(key=lambda p: p.created_at, reverse=True)

        return pets

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
        if not await self._can_view_pet(pet_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to view this pet"
            )

        sql = f"""
        select
            p.*,
            u.name as owner_name,
            g.name as group_name
        from pets p
        left join users u on (p.owner_id = u.id)
        left join groups g on (p.group_id = g.id)
        where
            p.id = '{pet_id}' and p.is_active = true
        """
        pet = await self.db.read_one(sql)
        if not pet:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
        pet["age"] = None if not pet["birth_date"] else int((dt.now(tz.utc) - pet["birth_date"]).days / 365.25)
        return PetDetails(**pet)

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
        if not await self._can_modify_pet(pet_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to modify this pet"
            )

        # Prepare update data
        update_data = {}

        # Update only provided fields
        if request.name is not None:
            update_data["name"] = request.name
        if request.breed is not None:
            update_data["breed"] = request.breed
        if request.gender is not None:
            update_data["gender"] = request.gender.value
        if request.birth_date is not None:
            update_data["birth_date"] = request.birth_date
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
        # Build SQL update query using direct value assignment (no param index)
        update_fields = []
        for key, value in update_data.items():
            # For string values, add single quotes; for others, use as is
            if isinstance(value, str):
                update_fields.append(f"{key} = '{value}'")
            else:
                update_fields.append(f"{key} = {value}")

        sql = f"""
        UPDATE pets
        SET {', '.join(update_fields)}
        WHERE id = '{pet_id}'
        """
        await self.db.execute(sql)

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
        # only owner can delete
        if not await self._is_owner(pet_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to delete this pet"
            )

        sql = f"""
        delete from pets where id = '{pet_id}'
        """
        await self.db.execute(sql)

        return {"message": "Pet has been deleted successfully"}

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
        if not await self._is_owner(pet_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to assign this pet to a group"
            )

        # Check the group's creator is the user_id
        sql = f"""
        select
            gm.group_id,
            gm.role
        from group_members gm
        where group_id = '{request.group_id}' and user_id = '{user_id}' and is_active = true
        """
        group_role = await self.db.read_one(sql)

        if not group_role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

        if group_role["role"] != "creator":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to assign this pet to this group",
            )

        # Update pet's group assignment
        sql = f"""
        UPDATE pets
        SET group_id = '{request.group_id}'
        WHERE id = '{pet_id}'
        """
        await self.db.execute(sql)

        # get pet info
        sql = f"""
        select
            p.id as pet_id,
            p.name as pet_name,
            g.id as group_id,
            g.name as group_name
        from
            pets p
        left join groups g on (p.group_id = g.id)
        where
            p.id = '{pet_id}'
            and p.is_active = true
        """
        info = await self.db.read_one(sql)
        info["user_role_in_group"] = group_role["role"]
        return GroupAssignmentInfo(**info)

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
        if not await self._can_view_pet(pet_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to view this pet"
            )

        sql = f"""
        select
            p.id as pet_id,
            p.name as pet_name,
            g.id as group_id,
            g.name as group_name,
            gm.role as user_role_in_group
        from
            pets p
        left join groups g on (p.group_id = g.id)
        left join group_members gm on (p.group_id = gm.group_id)
        where
            p.id = '{pet_id}'
            and gm.user_id = '{user_id}'
            and p.is_active = true
            and gm.is_active = true
        """
        info = await self.db.read_one(sql)
        return GroupAssignmentInfo(**info)

    # ================== Group-Based Pet Viewing ==================

    # ================== Photo Management ==================

    async def upload_pet_photo(self, pet_id: str, file: UploadFile, user_id: str) -> dict:
        """
        Upload or update a pet photo via Cloudinary. Only owners can upload.

        Args:
            pet_id: Pet to upload photo for
            file: Photo file upload
            user_id: User uploading the photo

        Returns:
            dict: Photo information including the Cloudinary secure URL
        """
        # Check permissions and get pet
        if not await self._is_owner(pet_id, user_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only pet owners can upload photos")

        # Read file content to validate size
        content = await file.read()
        actual_size = len(content)

        # Validate file has content
        if actual_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty. Please upload a valid image file with content.",
            )

        # Validate file size (max 10MB)
        if actual_size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size ({actual_size / 1024 / 1024:.2f}MB) exceeds maximum allowed size of 10MB",
            )

        # Upload to Cloudinary (overwrites previous asset under the same public_id)
        upload_result = await upload_image(
            content=content,
            folder="petcare/pet_photos",
            public_id=pet_id,
            content_type=file.content_type,
        )
        photo_url = upload_result["secure_url"]

        sql = f"""
        UPDATE pets
        SET photo_url = '{photo_url}'
        WHERE id = '{pet_id}'
        """
        await self.db.execute(sql)

        return {
            "photo_url": photo_url,
            "photo_name": upload_result["public_id"],
            "photo_size": actual_size,
            "photo_type": file.content_type,
            "photo_uploaded_at": int(dt.now(tz.utc).timestamp()),
        }
