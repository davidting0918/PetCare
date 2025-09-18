import base64
import os
from datetime import datetime as dt
from typing import Dict, List, Tuple

from fastapi import HTTPException, status

from backend.core.db_manager import get_db
from backend.models.meal import (
    CreateMealRequest,
    Meal,
    MealDetails,
    MealInfo,
    MealQueryFilters,
    MealStatistics,
    ServingType,
    TodayMealSummary,
    UpdateMealRequest,
    meal_table,
)
from backend.models.user import UserInfo


class MealService:
    """
    MealService handles all meal-related business logic following the group-based
    permissions model with independent meal endpoints using query parameters.

    Key Principles:
    - Independent Operation: Meal endpoints operate independently using query parameters
    - Group-Based Permissions: Access controlled through group membership roles
    - Automatic Calculations: Nutritional values calculated from food database
    - Collaborative Recording: All group members can contribute feeding records
    """

    def __init__(self):
        pass

    @property
    def db(self):
        """Get database client from global manager"""
        return get_db()

    # ================== Permission Helpers ==================

    async def _get_user_group_role(self, group_id: str, user_id: str) -> str:
        """
        Determine user's role in a specific group.

        Returns:
            str: User's role ("creator", "member", "viewer", "none")
        """
        sql = f"""
        SELECT role FROM group_members
        WHERE group_id = $1 AND user_id = $2 AND is_active = TRUE
        """
        role_result = await self.db.read_one(sql, group_id, user_id)
        return role_result["role"] if role_result else "none"

    async def _get_pet_group_context(self, pet_id: str) -> Dict[str, str]:
        """
        Get pet's group context for permission checking.

        Returns:
            Dict containing pet and group information
        """
        sql = f"""
        SELECT
            p.id as pet_id,
            p.name as pet_name,
            p.owner_id,
            p.group_id,
            g.name as group_name
        FROM pets p
        LEFT JOIN groups g ON p.group_id = g.id
        WHERE p.id = $1 AND p.is_active = TRUE AND g.is_active = TRUE
        """
        context = await self.db.read_one(sql, pet_id)
        if not context:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found or not accessible")
        return context

    async def _validate_food_access(self, food_id: str, group_id: str) -> Dict[str, any]:
        """
        Validate that food exists and is accessible in the given group.

        Returns:
            Dict containing food information
        """
        sql = f"""
        SELECT
            id, brand, product_name, food_type, target_pet, unit_weight,
            calories, protein, fat, moisture, carbohydrate
        FROM foods
        WHERE id = $1 AND group_id = $2 AND is_active = TRUE
        """
        food = await self.db.read_one(sql, food_id, group_id)
        if not food:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Food not found or not accessible in this group"
            )
        return food

    async def _can_record_meal(self, user_id: str, group_id: str) -> bool:
        """Check if user can record meals in the group (creator and member only)"""
        role = await self._get_user_group_role(group_id, user_id)
        return role in ["creator", "member"]

    async def _can_view_meals(self, user_id: str, group_id: str) -> bool:
        """Check if user can view meals in the group (all roles can view)"""
        role = await self._get_user_group_role(group_id, user_id)
        return role in ["creator", "member", "viewer"]

    async def _can_modify_meal(self, meal_id: str, user_id: str) -> Tuple[bool, Dict]:
        """
        Check if user can modify a specific meal record.

        Returns:
            Tuple of (can_modify: bool, meal_info: dict)
        """
        sql = f"""
        SELECT m.*, p.group_id
        FROM meals m
        JOIN pets p ON m.pet_id = p.id
        WHERE m.id = $1 AND m.is_active = TRUE
        """
        meal_info = await self.db.read_one(sql, meal_id)
        if not meal_info:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal record not found")

        group_id = meal_info["group_id"]
        user_role = await self._get_user_group_role(group_id, user_id)

        # Creator can modify any record, members can only modify their own
        can_modify = user_role == "creator" or (user_role == "member" and meal_info["fed_by"] == user_id)

        return can_modify, meal_info

    # ================== Nutritional Calculation Helpers ==================

    def _calculate_actual_weight(
        self, serving_type: ServingType, serving_amount: float, food_unit_weight: float
    ) -> float:
        """
        Calculate actual weight in grams based on serving input.

        Args:
            serving_type: Type of serving input (units or grams)
            serving_amount: Amount as entered by user
            food_unit_weight: Weight per unit from food database

        Returns:
            float: Actual weight in grams
        """
        if serving_type == ServingType.GRAMS:
            return serving_amount
        else:  # ServingType.UNITS
            return serving_amount * food_unit_weight

    def _calculate_nutrition_values(self, actual_weight_g: float, food_data: Dict) -> Dict[str, float]:
        """
        Calculate nutritional values based on actual weight and food nutrition per 100g.

        Args:
            actual_weight_g: Actual weight consumed in grams
            food_data: Food nutritional data per 100g

        Returns:
            Dict containing calculated nutritional values
        """
        # Calculate multiplier for actual weight vs 100g base
        multiplier = actual_weight_g / 100.0

        return {
            "calories": food_data["calories"] * multiplier,
            "protein_g": food_data["protein"] * multiplier,
            "fat_g": food_data["fat"] * multiplier,
            "moisture_g": food_data["moisture"] * multiplier,
            "carbohydrate_g": food_data["carbohydrate"] * multiplier,
        }

    # ================== CRUD Operations ==================

    async def create_meal(self, request: CreateMealRequest, user: UserInfo) -> MealDetails:
        """
        Create a new meal record with automatic nutritional calculations.

        Args:
            request: Meal creation details
            user: User creating the meal record

        Returns:
            MealDetails: Created meal information with full details
        """
        # Get pet context and validate access
        pet_context = await self._get_pet_group_context(request.pet_id)
        group_id = pet_context["group_id"]

        # Check if user can record meals in this group
        if not await self._can_record_meal(user.id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to record meals for pets in this group",
            )

        # Validate food access
        food_data = await self._validate_food_access(request.food_id, group_id)

        # Calculate actual weight and nutritional values
        actual_weight = self._calculate_actual_weight(
            request.serving_type, request.serving_amount, food_data["unit_weight"]
        )

        nutrition_values = self._calculate_nutrition_values(actual_weight, food_data)

        # Generate meal ID
        meal_id = base64.urlsafe_b64encode(os.urandom(16)).decode("utf-8").rstrip("=")
        current_time = dt.now()

        # Create meal record
        meal = Meal(
            id=meal_id,
            pet_id=request.pet_id,
            food_id=request.food_id,
            fed_by=user.id,
            group_id=group_id,
            fed_at=request.fed_at,
            meal_type=request.meal_type,
            serving_type=request.serving_type,
            serving_amount=request.serving_amount,
            actual_weight_g=actual_weight,
            calories=nutrition_values["calories"],
            protein_g=nutrition_values["protein_g"],
            fat_g=nutrition_values["fat_g"],
            moisture_g=nutrition_values["moisture_g"],
            carbohydrate_g=nutrition_values["carbohydrate_g"],
            created_at=current_time,
            updated_at=current_time,
            notes=request.notes,
        )

        # Save to database
        await self.db.insert_one(meal_table, meal.model_dump())

        # Return detailed meal information
        return await self.get_meal_details(meal_id, user.id)

    async def get_meals(self, filters: MealQueryFilters, user_id: str) -> List[MealInfo]:
        """
        Get meal records with comprehensive filtering support.

        Args:
            filters: Query filters
            user_id: User requesting the meals

        Returns:
            List[MealInfo]: Filtered meal records
        """
        # Validate permissions based on query scope
        if filters.pet_id:
            pet_context = await self._get_pet_group_context(filters.pet_id)
            group_id = pet_context["group_id"]
            if not await self._can_view_meals(user_id, group_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to view meals for this pet"
                )
        elif filters.group_id:
            if not await self._can_view_meals(user_id, filters.group_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have permission to view meals for this group",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Either pet_id or group_id must be provided"
            )

        # Build dynamic query
        conditions = ["m.is_active = TRUE"]
        params = []
        param_count = 0

        if filters.pet_id:
            param_count += 1
            conditions.append(f"m.pet_id = ${param_count}")
            params.append(filters.pet_id)
        elif filters.group_id:
            param_count += 1
            conditions.append(f"p.group_id = ${param_count}")
            params.append(filters.group_id)

        if filters.fed_by:
            param_count += 1
            conditions.append(f"m.fed_by = ${param_count}")
            params.append(filters.fed_by)

        if filters.date_from:
            param_count += 1
            conditions.append(f"DATE(m.fed_at) >= ${param_count}")
            params.append(filters.date_from)

        if filters.date_to:
            param_count += 1
            conditions.append(f"DATE(m.fed_at) <= ${param_count}")
            params.append(filters.date_to)

        if filters.meal_type:
            param_count += 1
            conditions.append(f"m.meal_type = ${param_count}")
            params.append(filters.meal_type.value)

        # Add limit and offset
        param_count += 1
        limit_param = f"${param_count}"
        params.append(filters.limit)

        param_count += 1
        offset_param = f"${param_count}"
        params.append(filters.offset)

        query = f"""
        SELECT
            m.*,
            p.name as pet_name,
            CONCAT(f.brand, ' - ', f.product_name) as food_name,
            u.name as fed_by_name
        FROM meals m
        JOIN pets p ON m.pet_id = p.id
        JOIN foods f ON m.food_id = f.id
        JOIN users u ON m.fed_by = u.id
        WHERE {' AND '.join(conditions)}
        ORDER BY m.fed_at DESC
        LIMIT {limit_param} OFFSET {offset_param}
        """

        meal_records = await self.db.read(query, *params)

        return [MealInfo(**record) for record in meal_records]

    async def get_meal_details(self, meal_id: str, user_id: str) -> MealDetails:
        """
        Get comprehensive meal information.

        Args:
            meal_id: ID of the meal to retrieve
            user_id: User requesting the information

        Returns:
            MealDetails: Complete meal information
        """
        query = f"""
        SELECT
            m.*,
            p.name as pet_name,
            f.brand as food_brand,
            f.product_name as food_product_name,
            CONCAT(f.brand, ' - ', f.product_name) as food_name,
            u.name as fed_by_name,
            g.name as group_name
        FROM meals m
        JOIN pets p ON m.pet_id = p.id
        JOIN foods f ON m.food_id = f.id
        JOIN users u ON m.fed_by = u.id
        JOIN groups g ON p.group_id = g.id
        WHERE m.id = $1 AND m.is_active = TRUE
        """

        meal_data = await self.db.read_one(query, meal_id)
        if not meal_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal record not found")

        # Check permissions
        group_id = meal_data["group_id"]
        if not await self._can_view_meals(user_id, group_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to view this meal record"
            )

        return MealDetails(**meal_data)

    async def update_meal(self, meal_id: str, request: UpdateMealRequest, user_id: str) -> MealDetails:
        """
        Update meal record with nutritional recalculation if needed.

        Args:
            meal_id: ID of the meal to update
            request: Update details
            user_id: User requesting the update

        Returns:
            MealDetails: Updated meal information
        """
        # Check permissions and get current meal
        can_modify, current_meal = await self._can_modify_meal(meal_id, user_id)
        if not can_modify:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to modify this meal record"
            )

        # Prepare update data
        update_data = {"updated_at": dt.now()}
        needs_recalculation = False

        # Check which fields are being updated
        if request.food_id is not None and request.food_id != current_meal["food_id"]:
            # Validate new food access
            await self._validate_food_access(request.food_id, current_meal["group_id"])
            update_data["food_id"] = request.food_id
            needs_recalculation = True

        if request.serving_type is not None:
            update_data["serving_type"] = request.serving_type.value
            needs_recalculation = True

        if request.serving_amount is not None:
            update_data["serving_amount"] = request.serving_amount
            needs_recalculation = True

        if request.fed_at is not None:
            update_data["fed_at"] = request.fed_at

        if request.meal_type is not None:
            update_data["meal_type"] = request.meal_type.value

        if request.notes is not None:
            update_data["notes"] = request.notes

        # Recalculate nutritional values if needed
        if needs_recalculation:
            # Get food data (use new food_id if changed, otherwise current)
            food_id = update_data.get("food_id", current_meal["food_id"])
            food_data = await self._validate_food_access(food_id, current_meal["group_id"])

            # Use new values if provided, otherwise current values
            serving_type = ServingType(update_data.get("serving_type", current_meal["serving_type"]))
            serving_amount = update_data.get("serving_amount", current_meal["serving_amount"])

            # Recalculate
            actual_weight = self._calculate_actual_weight(serving_type, serving_amount, food_data["unit_weight"])
            nutrition_values = self._calculate_nutrition_values(actual_weight, food_data)

            update_data.update(
                {
                    "actual_weight_g": actual_weight,
                    "calories": nutrition_values["calories"],
                    "protein_g": nutrition_values["protein_g"],
                    "fat_g": nutrition_values["fat_g"],
                    "moisture_g": nutrition_values["moisture_g"],
                    "carbohydrate_g": nutrition_values["carbohydrate_g"],
                }
            )

        # Execute update
        if update_data:
            set_clauses = []
            params = []
            param_count = 0

            for field, value in update_data.items():
                param_count += 1
                set_clauses.append(f"{field} = ${param_count}")
                params.append(value)

            param_count += 1
            update_query = f"UPDATE meals SET {', '.join(set_clauses)} WHERE id = ${param_count}"
            params.append(meal_id)

            await self.db.execute(update_query, *params)

        # Return updated details
        return await self.get_meal_details(meal_id, user_id)

    async def delete_meal(self, meal_id: str, user_id: str) -> Dict[str, str]:
        """
        Soft delete a meal record.

        Args:
            meal_id: ID of the meal to delete
            user_id: User requesting the deletion

        Returns:
            dict: Success confirmation
        """
        # Check permissions
        can_modify, meal_info = await self._can_modify_meal(meal_id, user_id)
        if not can_modify:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to delete this meal record"
            )

        # Soft delete
        await self.db.execute("UPDATE meals SET is_active = FALSE WHERE id = $1", meal_id)

        return {"message": "Meal record has been deleted successfully"}

    # ================== Specialized Query Operations ==================

    async def get_today_meals(self, filters: MealQueryFilters, user_id: str) -> TodayMealSummary:
        """
        Get today's meals with summary statistics.

        Args:
            filters: Query filters (pet_id or group_id required)
            user_id: User requesting the information

        Returns:
            TodayMealSummary: Today's feeding summary
        """
        today = dt.now().strftime("%Y-%m-%d")

        # Set date filters to today
        today_filters = MealQueryFilters(**filters.model_dump())
        today_filters.date_from = today
        today_filters.date_to = today
        today_filters.limit = 1000  # Get all today's meals
        today_filters.offset = 0

        # Get today's meals
        meals = await self.get_meals(today_filters, user_id)

        # Calculate summary statistics
        total_meals = len(meals)
        total_calories = sum(meal.calories for meal in meals)
        total_weight = sum(meal.actual_weight_g for meal in meals)

        # Count by meal type
        meal_type_counts = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
        for meal in meals:
            if meal.meal_type:
                meal_type_counts[meal.meal_type.value] += 1

        summary = TodayMealSummary(
            date=today,
            total_meals=total_meals,
            total_calories=total_calories,
            total_weight_g=total_weight,
            breakfast_count=meal_type_counts["breakfast"],
            lunch_count=meal_type_counts["lunch"],
            dinner_count=meal_type_counts["dinner"],
            snack_count=meal_type_counts["snack"],
        )

        # Add pet-specific information if filtering by pet
        if filters.pet_id:
            pet_context = await self._get_pet_group_context(filters.pet_id)

            # Get pet's calorie target
            pet_query = "SELECT daily_calorie_target FROM pets WHERE id = $1"
            pet_data = await self.db.read_one(pet_query, filters.pet_id)

            summary.pet_id = filters.pet_id
            summary.pet_name = pet_context["pet_name"]
            summary.daily_calorie_target = pet_data.get("daily_calorie_target") if pet_data else None

            if summary.daily_calorie_target and summary.daily_calorie_target > 0:
                summary.calorie_target_percentage = (total_calories / summary.daily_calorie_target) * 100

        # Add group-specific information if filtering by group
        elif filters.group_id:
            unique_pets = set(meal.pet_id for meal in meals)
            summary.group_id = filters.group_id
            summary.pets_fed_count = len(unique_pets)

        return summary

    async def get_meal_statistics(self, filters: MealQueryFilters, user_id: str) -> MealStatistics:
        """
        Generate comprehensive meal statistics for a time period.

        Args:
            filters: Query filters with date range
            user_id: User requesting the statistics

        Returns:
            MealStatistics: Statistical summary
        """
        # Require date range for statistics
        if not filters.date_from or not filters.date_to:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date range (date_from and date_to) is required for statistics",
            )

        # Get all meals in the period
        stat_filters = MealQueryFilters(**filters.model_dump())
        stat_filters.limit = 10000  # Get all meals for accurate statistics
        stat_filters.offset = 0

        meals = await self.get_meals(stat_filters, user_id)

        if not meals:
            # Return empty statistics if no meals found
            return MealStatistics(
                date_from=filters.date_from,
                date_to=filters.date_to,
                total_days=0,
                total_meals=0,
                total_calories=0,
                total_weight_g=0,
                average_meals_per_day=0,
                average_calories_per_day=0,
                average_protein_g_per_day=0,
                average_fat_g_per_day=0,
                average_moisture_g_per_day=0,
                average_carbohydrate_g_per_day=0,
                meal_type_distribution={},
                most_active_feeders=[],
                most_used_foods=[],
            )

        # Calculate date range
        from_date = dt.strptime(filters.date_from, "%Y-%m-%d")
        to_date = dt.strptime(filters.date_to, "%Y-%m-%d")
        total_days = (to_date - from_date).days + 1

        # Basic statistics
        total_meals = len(meals)
        total_calories = sum(meal.calories for meal in meals)
        total_weight = sum(meal.actual_weight_g for meal in meals)

        # Get detailed nutrition data
        detailed_query = f"""
        SELECT protein_g, fat_g, moisture_g, carbohydrate_g, meal_type, fed_by, food_id
        FROM meals m
        JOIN pets p ON m.pet_id = p.id
        WHERE m.is_active = TRUE
        AND DATE(m.fed_at) BETWEEN $1 AND $2
        """ + (
            f"AND m.pet_id = $3" if filters.pet_id else f"AND p.group_id = $3"
        )

        nutrition_params = [filters.date_from, filters.date_to]
        nutrition_params.append(filters.pet_id if filters.pet_id else filters.group_id)

        nutrition_data = await self.db.read(detailed_query, *nutrition_params)

        # Calculate nutritional averages
        total_protein = sum(row["protein_g"] for row in nutrition_data)
        total_fat = sum(row["fat_g"] for row in nutrition_data)
        total_moisture = sum(row["moisture_g"] for row in nutrition_data)
        total_carbs = sum(row["carbohydrate_g"] for row in nutrition_data)

        # Meal type distribution
        meal_type_counts = {}
        for row in nutrition_data:
            meal_type = row["meal_type"] or "unspecified"
            meal_type_counts[meal_type] = meal_type_counts.get(meal_type, 0) + 1

        # Most active feeders
        feeder_counts = {}
        for row in nutrition_data:
            fed_by = row["fed_by"]
            feeder_counts[fed_by] = feeder_counts.get(fed_by, 0) + 1

        # Get feeder names
        if feeder_counts:
            feeder_ids = list(feeder_counts.keys())
            feeder_query = f"SELECT id, name FROM users WHERE id = ANY($1)"
            feeder_names = await self.db.read(feeder_query, feeder_ids)
            feeder_name_map = {f["id"]: f["name"] for f in feeder_names}

            most_active_feeders = [
                {"user_name": feeder_name_map.get(user_id, "Unknown"), "meal_count": count}
                for user_id, count in sorted(feeder_counts.items(), key=lambda x: x[1], reverse=True)
            ][
                :5
            ]  # Top 5
        else:
            most_active_feeders = []

        # Most used foods
        food_counts = {}
        for row in nutrition_data:
            food_id = row["food_id"]
            food_counts[food_id] = food_counts.get(food_id, 0) + 1

        if food_counts:
            food_ids = list(food_counts.keys())
            food_query = f"SELECT id, CONCAT(brand, ' - ', product_name) as food_name FROM foods WHERE id = ANY($1)"
            food_names = await self.db.read(food_query, food_ids)
            food_name_map = {f["id"]: f["food_name"] for f in food_names}

            most_used_foods = [
                {"food_name": food_name_map.get(food_id, "Unknown"), "usage_count": count}
                for food_id, count in sorted(food_counts.items(), key=lambda x: x[1], reverse=True)
            ][
                :5
            ]  # Top 5
        else:
            most_used_foods = []

        return MealStatistics(
            date_from=filters.date_from,
            date_to=filters.date_to,
            total_days=total_days,
            total_meals=total_meals,
            total_calories=total_calories,
            total_weight_g=total_weight,
            average_meals_per_day=total_meals / total_days if total_days > 0 else 0,
            average_calories_per_day=total_calories / total_days if total_days > 0 else 0,
            average_protein_g_per_day=total_protein / total_days if total_days > 0 else 0,
            average_fat_g_per_day=total_fat / total_days if total_days > 0 else 0,
            average_moisture_g_per_day=total_moisture / total_days if total_days > 0 else 0,
            average_carbohydrate_g_per_day=total_carbs / total_days if total_days > 0 else 0,
            meal_type_distribution=meal_type_counts,
            most_active_feeders=most_active_feeders,
            most_used_foods=most_used_foods,
        )
