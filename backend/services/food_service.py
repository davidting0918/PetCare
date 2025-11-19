import base64
import os
from datetime import datetime as dt
from pathlib import Path
from typing import List, Optional

import aiofiles
from fastapi import HTTPException, UploadFile, status

from backend.core.db_manager import get_db
from backend.core.environment import build_static_url, get_photo_storage_path
from backend.models.food import (  # Tables; Models; Enums; Request Models; Response Models
    CreateFoodRequest,
    Food,
    FoodDetails,
    FoodInfo,
    FoodSearchResult,
    FoodType,
    TargetPet,
    UpdateFoodRequest,
    food_table,
)


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
        self.photo_storage_path = get_photo_storage_path("food_photos")

    @property
    def db(self):
        """Get database client from global manager"""
        return get_db()

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
        sql = f"""
        select
            gm.role
        from group_members gm
        where gm.group_id = '{group_id}' and gm.user_id = '{user_id}' and gm.is_active = true
        """
        role = await self.db.read_one(sql)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a member of this group to access its food database",
            )
        return role["role"]

    async def _get_user_food_role(self, user_id: str, food_id: str) -> str:
        """Get food's current group"""
        sql = f"""
        select group_id from foods where id = '{food_id}' and is_active = true
        """
        food = await self.db.read_one(sql)
        if not food:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food not found")
        group_id = food["group_id"]
        return await self._get_user_group_role(group_id, user_id)

    async def _can_view_food(self, user_id: str, food_id: str = None, group_id: str = None) -> bool:
        """Check if user can view foods in the group (all roles can view)"""

        if food_id:
            role = await self._get_user_food_role(user_id, food_id)
        if group_id:
            role = await self._get_user_group_role(group_id, user_id)

        return role in ["creator", "member", "viewer"]

    async def _can_manage_food(self, user_id: str, food_id: str = None, group_id: str = None) -> bool:
        """Check if user can modify foods in the group (creator and member only)"""
        if food_id:
            role = await self._get_user_food_role(user_id, food_id)
        if group_id:
            role = await self._get_user_group_role(group_id, user_id)

        return role in ["creator", "member"]

    # ================== Food CRUD Operations ==================

    async def create_food(self, group_id: str, request: CreateFoodRequest, user) -> FoodDetails:
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
        if not await self._can_manage_food(user_id=user.id, group_id=group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group creators and members can add foods to the database",
            )

        # Validate nutritional percentages sum (allowing for some tolerance)
        total_percentage = request.protein + request.fat + request.moisture + request.carbohydrate
        if total_percentage > 105:  # Allow 5% tolerance for measurement variations
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nutritional percentages cannot exceed 100% (total: {:.1f}%)".format(total_percentage),
            )

        # Generate food ID using a short, URL-safe base64 encoding of random bytes (8 chars)
        food_id = base64.urlsafe_b64encode(os.urandom(16)).decode("utf-8").rstrip("=")

        # Create food
        food = Food(
            id=food_id,
            group_id=group_id,
            creator_id=user.id,
            brand=request.brand,
            product_name=request.product_name,
            food_type=request.food_type,
            target_pet=request.target_pet,
            unit_weight=request.unit_weight,
            calories=request.calories,
            protein=request.protein,
            fat=request.fat,
            moisture=request.moisture,
            carbohydrate=request.carbohydrate,
            created_at=dt.now(),
            updated_at=dt.now(),
            photo_url="",
            is_active=True,
        )

        # Save to database
        await self.db.insert_one(food_table, food.model_dump())

        # Get group info for response
        sql = f"""select * from groups where id = '{group_id}'"""
        group_dict = await self.db.read_one(sql)
        group_name = group_dict["name"] if group_dict else "Unknown Group"

        # Calculate calories per unit for convenience
        calories_per_unit = (request.calories * request.unit_weight) / 100

        return FoodDetails(
            id=food.id,
            brand=food.brand,
            product_name=food.product_name,
            food_type=food.food_type,
            target_pet=food.target_pet,
            unit_weight=food.unit_weight,
            calories=food.calories,
            protein=food.protein,
            fat=food.fat,
            moisture=food.moisture,
            carbohydrate=food.carbohydrate,
            created_at=food.created_at,
            updated_at=food.updated_at,
            photo_url=food.photo_url,
            group_id=food.group_id,
            group_name=group_name,
            creator_id=user.id,
            creator_name=user.name,
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
        if not await self._can_view_food(group_id=group_id, user_id=user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this group's food database",
            )

        sql = f"""
        select
            f.*,
            g.name as group_name
        from foods f
        join groups g on f.group_id = g.id
        where
            f.group_id = '{group_id}'
            and f.is_active = true
            and g.is_active = true
            {f'and f.food_type = {food_type.value}' if food_type else ''}
            {f'and f.target_pet = {target_pet.value}' if target_pet else ''}
        """
        food_records = await self.db.read(sql)

        food_infos = [FoodInfo(**food_dict) for food_dict in food_records]

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
        if not await self._can_view_food(user_id=user_id, food_id=food_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this food",
            )

        sql = f"""
        select
            f.*,
            g.name as group_name,
            u.name as creator_name
        from foods f
        join group_members gm using (group_id)
        join groups g on (g.id = f.group_id)
        join users u on (u.id = f.creator_id)
        where
            f.id = '{food_id}'
            and f.is_active = true
            and gm.user_id = '{user_id}'
            and g.is_active = true
        """
        food_details = await self.db.read_one(sql)
        if not food_details:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food not found")

        # Calculate calories per unit
        calories_per_unit = (food_details["calories"] * food_details["unit_weight"]) / 100
        food_details["calories_per_unit"] = calories_per_unit
        return FoodDetails(**food_details)

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
        if not await self._can_manage_food(user_id=user_id, food_id=food_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to modify this food",
            )

        # Prepare update data
        update_data = {}

        # Update only provided fields
        if request.brand is not None:
            update_data["brand"] = request.brand
        if request.product_name is not None:
            update_data["product_name"] = request.product_name
        if request.food_type is not None:
            update_data["food_type"] = request.food_type.value
        if request.target_pet is not None:
            update_data["target_pet"] = request.target_pet.value
        if request.unit_weight is not None:
            update_data["unit_weight"] = request.unit_weight
        if request.calories is not None:
            update_data["calories"] = request.calories
        if request.protein is not None:
            update_data["protein"] = request.protein
        if request.fat is not None:
            update_data["fat"] = request.fat
        if request.moisture is not None:
            update_data["moisture"] = request.moisture
        if request.carbohydrate is not None:
            update_data["carbohydrate"] = request.carbohydrate

        # Update food in PostgreSQL
        if update_data:  # Only update if there are changes
            set_clauses = []
            params = []
            param_count = 0

            for field, value in update_data.items():
                param_count += 1
                set_clauses.append(f"{field} = ${param_count}")
                params.append(value)

            param_count += 1
            update_query = f"UPDATE foods SET {', '.join(set_clauses)} WHERE id = ${param_count}"
            params.append(food_id)

            await self.db.execute(update_query, *params)

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
        # Check permissions
        if not await self._can_manage_food(user_id=user_id, food_id=food_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this food",
            )

        sql = f"""
        delete from foods where id = '{food_id}'
        """
        await self.db.execute(sql)

        return {"message": "Food has been deleted from the group database"}

    # ================== Search and Discovery ==================

    async def search_foods(
        self,
        group_id: str,
        user_id: str,
        keyword: Optional[str] = None,
        food_type: Optional[FoodType] = None,
        target_pet: Optional[TargetPet] = None,
    ) -> List[FoodSearchResult]:
        """
        Search or list foods within a group's database.
        All group members can search/list the food database.

        Args:
            group_id: Target group ID
            user_id: User performing the search/list
            keyword: Optional search term for food names and brands. If None or empty, returns all foods.
            food_type: Optional filter by food type
            target_pet: Optional filter by target pet

        Returns:
            List[FoodSearchResult]: Matching or all foods
        """
        # Check permissions
        if not await self._can_view_food(user_id=user_id, group_id=group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to search this group's food database",
            )

        # Build PostgreSQL query with optional text search and filters
        conditions = ["group_id = $1", "is_active = TRUE"]
        params = [group_id]
        param_count = 1

        # Add text search condition only if keyword is provided and not empty
        if keyword and keyword.strip():
            param_count += 1
            keyword_search = f"%{keyword.lower().strip()}%"
            conditions.append(f"(LOWER(brand) LIKE ${param_count} OR LOWER(product_name) LIKE ${param_count})")
            params.append(keyword_search)

        if food_type:
            param_count += 1
            conditions.append(f"food_type = ${param_count}")
            params.append(food_type.value)

        if target_pet:
            param_count += 1
            conditions.append(f"target_pet = ${param_count}")
            params.append(target_pet.value)

        query = f"SELECT * FROM foods WHERE {' AND '.join(conditions)}"
        food_records = await self.db.read(query, *params)

        # Get group name for response
        group_query = "SELECT name FROM groups WHERE id = $1"
        group_dict = await self.db.read_one(group_query, group_id)
        group_name = group_dict["name"] if group_dict else "Unknown Group"

        search_results = []
        for food_dict in food_records:
            food = Food(**food_dict)

            search_results.append(
                FoodSearchResult(
                    id=food.id,
                    brand=food.brand,
                    product_name=food.product_name,
                    food_type=food.food_type,
                    target_pet=food.target_pet,
                    unit_weight=food.unit_weight,
                    calories=food.calories,
                    photo_url=food.photo_url,
                    group_id=food.group_id,
                    group_name=group_name,
                )
            )

        # Sort results
        if keyword and keyword.strip():
            # Sort by relevance (brand matches first, then product name matches)
            def sort_key(result: FoodSearchResult):
                keyword_lower = keyword.lower().strip()
                brand_match = keyword_lower in result.brand.lower()
                product_match = keyword_lower in result.product_name.lower()
                return (not brand_match, not product_match, result.brand.lower(), result.product_name.lower())

            search_results.sort(key=sort_key)
        else:
            # Sort alphabetically by brand and product name
            search_results.sort(key=lambda r: (r.brand.lower(), r.product_name.lower()))

        return search_results

    # ================== Photo Management ==================

    async def upload_food_photo(self, food_id: str, file: UploadFile, user_id: str) -> dict:
        """
        Upload or update a photo for a food item.
        Only creators and members can upload photos.

        Args:
            food_id: Food to upload photo for
            file: Photo file upload
            user_id: User uploading the photo

        Returns:
            dict: Photo information including URL and metadata
        """
        # Check permissions
        if not await self._can_manage_food(user_id=user_id, food_id=food_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only group creators and members can upload food photos",
            )

        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if not file.content_type or file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}",
            )

        # Read file content to validate size
        content = await file.read()
        actual_size = len(content)

        # Validate file has content
        if actual_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty. Please upload a valid image file with content.",
            )

        # Validate file size (max 5MB for food photos)
        if actual_size > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size ({actual_size / 1024 / 1024:.2f}MB) exceeds maximum allowed size of 5MB",
            )

        # Generate filename using food_id (deterministic naming)
        file_extension = Path(file.filename).suffix if file.filename else ".jpg"
        file_name = f"{food_id}{file_extension}"
        file_path = os.path.join(self.photo_storage_path, file_name)
        # Build photo URL based on environment configuration
        photo_url = build_static_url("food_photos", file_name)

        try:
            # Save file to storage (content already read for validation)
            async with aiofiles.open(file_path, "wb") as f:
                await f.write(content)

            # Update food record with photo URL
            sql = f"""
            UPDATE foods
            SET photo_url = '{photo_url}'
            WHERE id = '{food_id}'
            """
            await self.db.execute(sql)

            return {
                "photo_url": photo_url,
                "photo_name": file_name,
                "photo_size": actual_size,
                "photo_type": file.content_type,
                "photo_uploaded_at": int(dt.now().timestamp()),
            }

        except Exception as e:
            # Clean up file if database operation fails
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to upload photo: {str(e)}"
            )

    def _extract_filename_from_url(self, photo_url: str) -> str | None:
        """
        Extract filename from photo URL.

        Args:
            photo_url: Photo URL (e.g., /static/food_photos/abc123.jpg)

        Returns:
            str | None: Filename or None if invalid
        """
        if not photo_url:
            return None
        # Extract filename from URL (handles both relative and absolute URLs)
        if "/" in photo_url:
            return photo_url.split("/")[-1]
        return photo_url
