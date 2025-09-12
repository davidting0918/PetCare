import os
import uuid
from datetime import datetime as dt
from datetime import timezone as tz
from pathlib import Path
from typing import List, Optional

import aiofiles
from fastapi import HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from backend.core.database import MongoAsyncClient
from backend.models.food import (  # Collections; Models; Enums; Request Models; Response Models
    CreateFoodRequest,
    Food,
    FoodDetails,
    FoodInfo,
    FoodPhoto,
    FoodPhotoInfo,
    FoodSearchResult,
    FoodType,
    TargetPet,
    UpdateFoodRequest,
    food_collection,
    food_photo_collection,
)
from backend.models.group import group_collection
from backend.models.user import user_collection


class FoodService:
    """
    FoodService handles all food-related business logic following the group-based
    food database model specified in the API documentation.

    Key Principles:
    - Group-Based Database: Each group maintains its own independent food collection
    - Collaborative Management: Creator and Member roles can modify food database
    - Shared Resource: Foods are available to all group members
    - Permission-Based Access: Access controlled through group membership roles
    """

    def __init__(self):
        self.db = MongoAsyncClient()
        self.photo_storage_path = "backend/storage/food_photos"

        # Ensure photo storage directory exists
        os.makedirs(self.photo_storage_path, exist_ok=True)

    # ================== Permission Helpers ==================

    async def _get_user_group_role(self, group_id: str, user_id: str) -> str:
        """
        Determine user's role in a specific group.

        Args:
            group_id: Target group ID
            user_id: User to check role for

        Returns:
            str: User's role ("creator", "member", "none")

        Raises:
            HTTPException: If group not found or user not a member
        """
        group_dict = await self.db.find_one(group_collection, {"id": group_id, "is_active": True})
        if not group_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

        # Check if user is in group's member list
        if user_id not in group_dict.get("member_ids", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a member of this group to access its food database",
            )

        # Determine role within group
        if group_dict["creator_id"] == user_id:
            return "creator"
        else:
            return "member"

    async def _can_view_food(self, group_id: str, user_id: str) -> bool:
        """Check if user can view foods in the group (all roles can view)"""
        try:
            await self._get_user_group_role(group_id, user_id)
            return True
        except HTTPException:
            return False

    async def _can_manage_food(self, group_id: str, user_id: str) -> bool:
        """Check if user can modify foods in the group (creator and member only)"""
        try:
            role = await self._get_user_group_role(group_id, user_id)
            return role in ["creator", "member"]
        except HTTPException:
            return False

    async def _get_food_with_permission_check(
        self, food_id: str, user_id: str, require_manage: bool = False
    ) -> tuple[Food, str]:
        """
        Get food and check user permissions.

        Args:
            food_id: Target food ID
            user_id: User requesting access
            require_manage: If True, requires management permissions

        Returns:
            tuple[Food, str]: Food object and user's group role

        Raises:
            HTTPException: If food not found or user lacks permissions
        """
        food_dict = await self.db.find_one(food_collection, {"id": food_id, "is_active": True})
        if not food_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food not found")

        food = Food(**food_dict)

        if require_manage:
            if not await self._can_manage_food(food.group_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to modify foods in this group",
                )
        else:
            if not await self._can_view_food(food.group_id, user_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to view foods in this group",
                )

        role = await self._get_user_group_role(food.group_id, user_id)
        return food, role

    # ================== Food CRUD Operations ==================

    async def create_food(self, group_id: str, request: CreateFoodRequest, user_id: str) -> FoodDetails:
        """
        Create a new food item in the group's database.
        Only creators and members can add foods to the group database.

        Args:
            group_id: Target group for the food database
            request: Food creation details
            user_id: User creating the food

        Returns:
            FoodDetails: Created food information
        """
        # Check permissions
        if not await self._can_manage_food(group_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group creators and members can add foods to the database",
            )

        # Validate nutritional percentages sum (allowing for some tolerance)
        total_percentage = (
            request.protein_percentage
            + request.fat_percentage
            + request.moisture_percentage
            + request.carbohydrate_percentage
        )
        if total_percentage > 105:  # Allow 5% tolerance for measurement variations
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nutritional percentages cannot exceed 100% (total: {:.1f}%)".format(total_percentage),
            )

        # Generate food ID and timestamps
        food_id = str(uuid.uuid4())[:8]
        current_time = int(dt.now(tz.utc).timestamp())

        # Create food
        food = Food(
            id=food_id,
            group_id=group_id,
            brand=request.brand,
            product_name=request.product_name,
            food_type=request.food_type,
            target_pet=request.target_pet,
            unit_weight_g=request.unit_weight_g,
            calories_per_100g=request.calories_per_100g,
            protein_percentage=request.protein_percentage,
            fat_percentage=request.fat_percentage,
            moisture_percentage=request.moisture_percentage,
            carbohydrate_percentage=request.carbohydrate_percentage,
            created_at=current_time,
            updated_at=current_time,
            is_active=True,
        )

        # Save to database
        await self.db.insert_one(food_collection, food.model_dump())

        # Get group info for response
        group_dict = await self.db.find_one(group_collection, {"id": group_id})
        group_name = group_dict["name"] if group_dict else "Unknown Group"

        # Calculate calories per unit for convenience
        calories_per_unit = (request.calories_per_100g * request.unit_weight_g) / 100

        return FoodDetails(
            id=food.id,
            brand=food.brand,
            product_name=food.product_name,
            food_type=food.food_type,
            target_pet=food.target_pet,
            unit_weight_g=food.unit_weight_g,
            calories_per_100g=food.calories_per_100g,
            protein_percentage=food.protein_percentage,
            fat_percentage=food.fat_percentage,
            moisture_percentage=food.moisture_percentage,
            carbohydrate_percentage=food.carbohydrate_percentage,
            created_at=food.created_at,
            updated_at=food.updated_at,
            group_id=food.group_id,
            group_name=group_name,
            has_photo=False,
            calories_per_unit=calories_per_unit,
        )

    async def get_group_foods(
        self, group_id: str, user_id: str, food_type: Optional[FoodType] = None, target_pet: Optional[TargetPet] = None
    ) -> List[FoodInfo]:
        """
        Get all foods in a group's database with optional filtering.
        All group members can view the food database.

        Args:
            group_id: Target group ID
            user_id: User requesting the food list
            food_type: Optional filter by food type
            target_pet: Optional filter by target pet

        Returns:
            List[FoodInfo]: Foods in the group database
        """
        # Check permissions
        if not await self._can_view_food(group_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this group's food database",
            )

        # Build query filter
        query_filter = {"group_id": group_id, "is_active": True}

        if food_type:
            query_filter["food_type"] = food_type.value
        if target_pet:
            query_filter["target_pet"] = target_pet.value

        # Get foods from database
        foods = await self.db.find_many(food_collection, query_filter)

        # Get group name for response
        group_dict = await self.db.find_one(group_collection, {"id": group_id})
        group_name = group_dict["name"] if group_dict else "Unknown Group"

        food_infos = []
        for food_dict in foods:
            food = Food(**food_dict)

            # Check if photo exists
            photo_exists = await self.db.find_one(food_photo_collection, {"id": food.id, "is_active": True}) is not None

            food_infos.append(
                FoodInfo(
                    id=food.id,
                    brand=food.brand,
                    product_name=food.product_name,
                    food_type=food.food_type,
                    target_pet=food.target_pet,
                    unit_weight_g=food.unit_weight_g,
                    calories_per_100g=food.calories_per_100g,
                    protein_percentage=food.protein_percentage,
                    fat_percentage=food.fat_percentage,
                    has_photo=photo_exists,
                    created_at=food.created_at,
                    group_id=food.group_id,
                    group_name=group_name,
                )
            )

        # Sort by brand and product name
        food_infos.sort(key=lambda f: (f.brand.lower(), f.product_name.lower()))

        return food_infos

    async def get_food_details(self, food_id: str, user_id: str) -> FoodDetails:
        """
        Get comprehensive food information.
        All group members can view detailed food information.

        Args:
            food_id: Food ID to get details for
            user_id: User requesting the information

        Returns:
            FoodDetails: Comprehensive food information
        """
        # Check permissions and get food
        food, role = await self._get_food_with_permission_check(food_id, user_id, require_manage=False)

        # Get group information
        group_dict = await self.db.find_one(group_collection, {"id": food.group_id})
        group_name = group_dict["name"] if group_dict else "Unknown Group"

        # Check if photo exists
        photo_exists = await self.db.find_one(food_photo_collection, {"id": food.id, "is_active": True}) is not None

        # Calculate calories per unit
        calories_per_unit = (food.calories_per_100g * food.unit_weight_g) / 100

        return FoodDetails(
            id=food.id,
            brand=food.brand,
            product_name=food.product_name,
            food_type=food.food_type,
            target_pet=food.target_pet,
            unit_weight_g=food.unit_weight_g,
            calories_per_100g=food.calories_per_100g,
            protein_percentage=food.protein_percentage,
            fat_percentage=food.fat_percentage,
            moisture_percentage=food.moisture_percentage,
            carbohydrate_percentage=food.carbohydrate_percentage,
            created_at=food.created_at,
            updated_at=food.updated_at,
            group_id=food.group_id,
            group_name=group_name,
            has_photo=photo_exists,
            calories_per_unit=calories_per_unit,
        )

    async def update_food(self, food_id: str, request: UpdateFoodRequest, user_id: str) -> FoodDetails:
        """
        Update food information.
        Only creators and members can modify foods in the group database.

        Args:
            food_id: Food to update
            request: Update details
            user_id: User requesting the update

        Returns:
            FoodDetails: Updated food information
        """
        # Check permissions and get food
        food, role = await self._get_food_with_permission_check(food_id, user_id, require_manage=True)

        # Prepare update data
        update_data = {"updated_at": int(dt.now(tz.utc).timestamp())}

        # Update only provided fields
        if request.brand is not None:
            update_data["brand"] = request.brand
        if request.product_name is not None:
            update_data["product_name"] = request.product_name
        if request.food_type is not None:
            update_data["food_type"] = request.food_type.value
        if request.target_pet is not None:
            update_data["target_pet"] = request.target_pet.value
        if request.unit_weight_g is not None:
            update_data["unit_weight_g"] = request.unit_weight_g
        if request.calories_per_100g is not None:
            update_data["calories_per_100g"] = request.calories_per_100g
        if request.protein_percentage is not None:
            update_data["protein_percentage"] = request.protein_percentage
        if request.fat_percentage is not None:
            update_data["fat_percentage"] = request.fat_percentage
        if request.moisture_percentage is not None:
            update_data["moisture_percentage"] = request.moisture_percentage
        if request.carbohydrate_percentage is not None:
            update_data["carbohydrate_percentage"] = request.carbohydrate_percentage

        # Validate nutritional percentages if any are being updated
        nutritional_updates = [
            request.protein_percentage,
            request.fat_percentage,
            request.moisture_percentage,
            request.carbohydrate_percentage,
        ]
        if any(x is not None for x in nutritional_updates):
            # Get current values for fields not being updated
            current_protein = (
                request.protein_percentage if request.protein_percentage is not None else food.protein_percentage
            )
            current_fat = request.fat_percentage if request.fat_percentage is not None else food.fat_percentage
            current_moisture = (
                request.moisture_percentage if request.moisture_percentage is not None else food.moisture_percentage
            )
            current_carb = (
                request.carbohydrate_percentage
                if request.carbohydrate_percentage is not None
                else food.carbohydrate_percentage
            )

            total_percentage = current_protein + current_fat + current_moisture + current_carb
            if total_percentage > 105:  # Allow 5% tolerance
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Updated nutritional percentages cannot exceed 100% (total: {:.1f}%)".format(
                        total_percentage
                    ),
                )

        # Update food
        await self.db.update_one(food_collection, {"id": food_id}, update_data)

        # Return updated food details
        return await self.get_food_details(food_id, user_id)

    async def delete_food(self, food_id: str, user_id: str) -> dict:
        """
        Soft delete a food item from the group database.
        Only creators and members can delete foods from the group database.

        Args:
            food_id: Food to delete
            user_id: User requesting the deletion

        Returns:
            dict: Success confirmation
        """
        # Check permissions and get food
        food, role = await self._get_food_with_permission_check(food_id, user_id, require_manage=True)

        # Soft delete food
        await self.db.update_one(
            food_collection, {"id": food_id}, {"is_active": False, "updated_at": int(dt.now(tz.utc).timestamp())}
        )

        return {"message": f"Food '{food.brand} - {food.product_name}' has been removed from the group database"}

    # ================== Search and Discovery ==================

    async def search_foods(
        self,
        group_id: str,
        user_id: str,
        keyword: str,
        food_type: Optional[FoodType] = None,
        target_pet: Optional[TargetPet] = None,
    ) -> List[FoodSearchResult]:
        """
        Search foods within a group's database by keyword.
        All group members can search the food database.

        Args:
            group_id: Target group ID
            user_id: User performing the search
            keyword: Search term for food names and brands
            food_type: Optional filter by food type
            target_pet: Optional filter by target pet

        Returns:
            List[FoodSearchResult]: Matching foods
        """
        # Check permissions
        if not await self._can_view_food(group_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to search this group's food database",
            )

        # Build query filter
        query_filter = {"group_id": group_id, "is_active": True}

        if food_type:
            query_filter["food_type"] = food_type.value
        if target_pet:
            query_filter["target_pet"] = target_pet.value

        # Add text search using MongoDB regex (case-insensitive)
        keyword_regex = {"$regex": keyword, "$options": "i"}
        query_filter["$or"] = [{"brand": keyword_regex}, {"product_name": keyword_regex}]

        # Get matching foods
        foods = await self.db.find_many(food_collection, query_filter)

        # Get group name for response
        group_dict = await self.db.find_one(group_collection, {"id": group_id})
        group_name = group_dict["name"] if group_dict else "Unknown Group"

        search_results = []
        for food_dict in foods:
            food = Food(**food_dict)

            # Check if photo exists
            photo_exists = await self.db.find_one(food_photo_collection, {"id": food.id, "is_active": True}) is not None

            search_results.append(
                FoodSearchResult(
                    id=food.id,
                    brand=food.brand,
                    product_name=food.product_name,
                    food_type=food.food_type,
                    target_pet=food.target_pet,
                    unit_weight_g=food.unit_weight_g,
                    calories_per_100g=food.calories_per_100g,
                    has_photo=photo_exists,
                    group_id=food.group_id,
                    group_name=group_name,
                )
            )

        # Sort by relevance (brand matches first, then product name matches)
        def sort_key(result: FoodSearchResult):
            brand_match = keyword.lower() in result.brand.lower()
            product_match = keyword.lower() in result.product_name.lower()
            return (not brand_match, not product_match, result.brand.lower(), result.product_name.lower())

        search_results.sort(key=sort_key)

        return search_results

    # ================== Photo Management ==================

    async def upload_food_photo(self, food_id: str, file: UploadFile, user_id: str) -> FoodPhotoInfo:
        """
        Upload or update a photo for a food item.
        Only creators and members can upload photos.

        Args:
            food_id: Food to upload photo for
            file: Photo file upload
            user_id: User uploading the photo

        Returns:
            FoodPhotoInfo: Photo information
        """
        # Check permissions and get food
        food, role = await self._get_food_with_permission_check(food_id, user_id, require_manage=True)

        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed")

        # Validate file size (max 5MB for food photos)
        if file.size and file.size > 5 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size must be less than 5MB")

        # Generate file path using food_id as filename for simplified storage
        file_extension = Path(file.filename).suffix if file.filename else ".jpg"
        filename = f"{food_id}{file_extension}"
        file_path = os.path.join(self.photo_storage_path, filename)

        try:
            # Save file to storage
            async with aiofiles.open(file_path, "wb") as f:
                content = await file.read()
                await f.write(content)

            # Get file size
            file_size = len(content)

            # Remove old photo if exists
            await self._remove_old_photo(food_id)

            # Create photo record
            photo = FoodPhoto(
                id=food_id,  # Use food_id as photo_id for simplified 1:1 relationship
                filename=file.filename or f"food_photo{file_extension}",
                file_path=file_path,
                file_size=file_size,
                content_type=file.content_type,
                uploaded_by=user_id,
                uploaded_at=int(dt.now(tz.utc).timestamp()),
                is_active=True,
            )

            # Save photo record
            await self.db.insert_one(food_photo_collection, photo.model_dump())

            # Get uploader name
            uploader_dict = await self.db.find_one(user_collection, {"id": user_id})
            uploader_name = uploader_dict["name"] if uploader_dict else "Unknown"

            return FoodPhotoInfo(
                id=photo.id,  # Same as food_id
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

    async def get_food_photo(self, food_id: str, user_id: str) -> FileResponse:
        """
        Get food photo file. User must have access to the food to view its photo.

        Args:
            food_id: Food ID to retrieve photo for
            user_id: User requesting the photo

        Returns:
            FileResponse: Photo file response
        """
        # Get photo record
        photo_dict = await self.db.find_one(food_photo_collection, {"id": food_id, "is_active": True})
        if not photo_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

        photo = FoodPhoto(**photo_dict)

        # Check food access permissions (photo.id is the food_id)
        await self._get_food_with_permission_check(photo.id, user_id, require_manage=False)

        # Check if file exists
        if not os.path.exists(photo.file_path):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo file not found")

        return FileResponse(
            path=photo.file_path,
            media_type=photo.content_type,
            filename=photo.filename,
            headers={"Cache-Control": "public, max-age=3600"},  # 1 hour cache
        )

    async def delete_food_photo(self, food_id: str, user_id: str) -> dict:
        """
        Delete food photo. Only creators and members can delete photos.

        Args:
            food_id: Food to delete photo from
            user_id: User requesting the deletion

        Returns:
            dict: Success confirmation
        """
        # Check permissions and get food
        food, role = await self._get_food_with_permission_check(food_id, user_id, require_manage=True)

        # Remove photo
        await self._remove_old_photo(food_id)

        return {"message": f"Photo for food '{food.brand} - {food.product_name}' has been deleted successfully"}

    async def _remove_old_photo(self, food_id: str):
        """Helper method to remove old photo files and records"""
        try:
            # Get photo record
            photo_dict = await self.db.find_one(food_photo_collection, {"id": food_id})
            if photo_dict:
                photo = FoodPhoto(**photo_dict)

                # Remove file if exists
                if os.path.exists(photo.file_path):
                    os.remove(photo.file_path)

                # Delete photo record
                await self.db.delete_one(food_photo_collection, {"id": food_id})
        except Exception:
            # Don't fail the main operation if cleanup fails
            pass
