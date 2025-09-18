from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query

from backend.models.meal import CreateMealRequest, MealQueryFilters, MealType, UpdateMealRequest
from backend.models.user import UserInfo
from backend.services.auth_service import get_current_user
from backend.services.meal_service import MealService

router = APIRouter(prefix="/meals", tags=["meals"])
meal_service = MealService()


# ================== CRUD Operations ==================


@router.post("", response_model=dict)
async def create_meal_record(
    request: CreateMealRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """
    Records a new feeding session for a pet with automatic nutritional calculations.

    Authorization: Creator or Member permissions required for the pet's associated group

    This endpoint captures complete feeding information and automatically calculates
    nutritional values based on the food database and serving information provided.

    Key Features:
    - Validates user permissions to record feeding for the specified pet through group membership
    - Verifies that the selected food exists and is accessible within the pet's group
    - Supports both unit-based (cans, pieces) and weight-based (grams) serving measurements
    - Automatically calculates actual weight based on food unit weight and serving amount
    - Computes caloric and nutritional intake using food database information
    - Records feeding timestamp and attribution for complete audit trail

    Body:
    - pet_id: ID of the pet being fed (required)
    - food_id: ID of the food given to the pet (required)
    - fed_at: When the pet was fed (optional, defaults to current time)
    - meal_type: Type of meal classification (breakfast/lunch/dinner/snack, optional)
    - serving_type: Method of serving input ("units" or "grams", required)
    - serving_amount: Amount served in specified units (required, 0-10000)
    - notes: Additional feeding notes (optional, max 500 characters)

    Serving Input Examples:
    - Wet food: serving_type="units", serving_amount=0.5 (0.5 cans)
    - Dry food: serving_type="units", serving_amount=200 (200 pieces)
    - Direct weight: serving_type="grams", serving_amount=150 (150 grams)

    Returns:
    - Complete meal details with calculated nutritional information
    - Pet and food context information
    - Feeding attribution and timing details
    """
    try:
        meal_details = await meal_service.create_meal(request, current_user)
        return {
            "status": 1,
            "data": meal_details.model_dump(),
            "message": f"Meal recorded for {meal_details.pet_name} successfully",
        }
    except Exception as e:
        raise e


@router.get("", response_model=dict)
async def get_meal_records(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    pet_id: Optional[str] = Query(None, description="Filter records for a specific pet"),
    group_id: Optional[str] = Query(None, description="Filter records for all pets in a group"),
    fed_by: Optional[str] = Query(None, description="Filter records by feeder"),
    date_from: Optional[str] = Query(None, description="Start date for filtering (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date for filtering (YYYY-MM-DD)"),
    meal_type: Optional[MealType] = Query(None, description="Filter by meal type"),
    limit: Optional[int] = Query(50, ge=1, le=1000, description="Maximum records to return"),
    offset: Optional[int] = Query(0, ge=0, description="Number of records to skip"),
) -> dict:
    """
    Retrieves feeding records with comprehensive filtering options for various analysis scenarios.

    Authorization: Appropriate access rights required based on query parameters

    This endpoint provides flexible access to feeding records supporting both pet-specific
    and group-wide queries with extensive filtering capabilities for detailed analysis.

    Query Parameters:
    - pet_id: Filter for specific pet (requires access to pet's group)
    - group_id: Filter for all pets in a group (requires group membership)
    - fed_by: Filter by the person who performed the feeding
    - date_from/date_to: Date range filtering (YYYY-MM-DD format)
    - meal_type: Filter by meal classification
    - limit: Maximum records to return (1-1000, default 50)
    - offset: Pagination offset (default 0)

    Permission Requirements:
    - Pet-level queries: Access to pet's associated group
    - Group-level queries: Group membership (any role)
    - Must specify either pet_id or group_id

    Query Examples:
    - Specific pet's records: ?pet_id=pet123
    - Group's all records: ?group_id=group456
    - Weekly history: ?pet_id=pet123&date_from=2025-01-08&date_to=2025-01-15
    - Breakfast records: ?pet_id=pet123&meal_type=breakfast
    - Specific feeder: ?group_id=group456&fed_by=user789

    Returns:
    - List of meal records with essential feeding information
    - Pet names, food details, and feeder attribution
    - Serving information and caloric data
    - Results ordered by feeding time (most recent first)
    """
    try:
        filters = MealQueryFilters(
            pet_id=pet_id,
            group_id=group_id,
            fed_by=fed_by,
            date_from=date_from,
            date_to=date_to,
            meal_type=meal_type,
            limit=limit,
            offset=offset,
        )

        meals = await meal_service.get_meals(filters, current_user.id)
        return {
            "status": 1,
            "data": [meal.model_dump() for meal in meals],
            "message": f"Found {len(meals)} meal records",
        }
    except Exception as e:
        raise e


@router.get("/{meal_id}/details", response_model=dict)
async def get_meal_record_details(meal_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Retrieves comprehensive information about a specific feeding record.

    Authorization: Group membership required for the meal's associated group

    This endpoint provides complete meal record details including all contextual
    information, calculated nutritional values, and audit trail data.

    Features:
    - Complete feeding record with full pet and food information
    - Detailed nutritional breakdown with precise calculations
    - Serving input details (both user input and calculated amounts)
    - Feeder attribution and accurate timestamp data
    - Group context for collaboration tracking

    Returns:
    - Complete meal details with pet information
    - Food details including brand and product information
    - Serving information (input method, amount, actual weight)
    - Full nutritional calculation breakdown
    - Feeding context (feeder, timing, meal type)
    - Group collaboration context
    """
    try:
        meal_details = await meal_service.get_meal_details(meal_id, current_user.id)
        return {
            "status": 1,
            "data": meal_details.model_dump(),
            "message": "Meal details retrieved successfully",
        }
    except Exception as e:
        raise e


@router.post("/{meal_id}/update", response_model=dict)
async def update_meal_record(
    meal_id: str,
    request: UpdateMealRequest,
    current_user: Annotated[UserInfo, Depends(get_current_user)],
) -> dict:
    """
    Allows correction of existing feeding records with automatic nutritional recalculation.

    Authorization: Original recorder or group Creator permissions required

    This endpoint supports partial updates for correcting feeding record errors while
    automatically recalculating nutritional values when food or serving information changes.

    Permission Rules:
    - Creators can modify any record in their groups
    - Members can only modify their own feeding records
    - Viewers cannot modify any records

    Body (all fields optional):
    - food_id: Updated food selection
    - fed_at: Corrected feeding time
    - meal_type: Updated meal classification
    - serving_type: Corrected serving input method
    - serving_amount: Corrected serving amount
    - notes: Updated feeding notes

    Automatic Recalculation:
    - When food_id changes, validates new food access in the group
    - When serving_type or serving_amount changes, recalculates actual weight
    - Automatically updates all nutritional values based on new calculations
    - Preserves audit trail with update timestamps

    Data Integrity:
    - Validates food availability within the group
    - Maintains referential integrity with related data
    - Preserves historical context while allowing corrections
    - Updates modification timestamp and tracking

    Returns:
    - Updated complete meal details
    - Recalculated nutritional information
    - Updated audit trail information
    """
    try:
        meal_details = await meal_service.update_meal(meal_id, request, current_user.id)
        return {
            "status": 1,
            "data": meal_details.model_dump(),
            "message": f"Meal record for {meal_details.pet_name} updated successfully",
        }
    except Exception as e:
        raise e


@router.post("/{meal_id}/delete", response_model=dict)
async def delete_meal_record(meal_id: str, current_user: Annotated[UserInfo, Depends(get_current_user)]) -> dict:
    """
    Removes incorrect or duplicate feeding records through soft deletion.

    Authorization: Original recorder or group Creator permissions required

    This endpoint implements soft deletion to maintain data integrity for historical
    analysis while removing incorrect records from active use.

    Permission Rules:
    - Creators can delete any record in their groups
    - Members can only delete their own feeding records
    - Viewers cannot delete any records

    Soft Deletion Benefits:
    - Preserves historical data for reporting and statistics
    - Maintains referential integrity with related systems
    - Allows for potential record recovery if needed
    - Supports audit trails and compliance requirements

    Operations Performed:
    - Marks record as inactive rather than physical deletion
    - Records deletion audit information (who deleted and when)
    - Removes from active queries and daily summaries
    - Preserves data for historical analysis and statistics

    Returns:
    - Success confirmation with appropriate status
    - Maintains system consistency after removal
    """
    try:
        result = await meal_service.delete_meal(meal_id, current_user.id)
        return {"status": 1, "data": result, "message": "Meal record deleted successfully"}
    except Exception as e:
        raise e


# ================== Specialized Query Endpoints ==================


@router.get("/today", response_model=dict)
async def get_today_meals(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    pet_id: Optional[str] = Query(None, description="Show today's meals for a specific pet"),
    group_id: Optional[str] = Query(None, description="Show today's meals for all pets in a group"),
    fed_by: Optional[str] = Query(None, description="Filter today's meals by specific feeder"),
    meal_type: Optional[MealType] = Query(None, description="Filter today's meals by meal type"),
) -> dict:
    """
    Provides quick access to current day's feeding records for daily monitoring and care coordination.

    Authorization: Appropriate access rights required based on query scope

    This endpoint automatically filters records to the current date and provides
    real-time feeding status for coordination among group members.

    Query Parameters:
    - pet_id: Show today's meals for a specific pet
    - group_id: Show today's meals for all pets in a group
    - fed_by: Filter today's meals by specific feeder
    - meal_type: Filter by meal classification

    Features:
    - Automatically filters to current system date
    - Supports both pet-specific and group-wide daily views
    - Provides running totals of daily intake
    - Includes meal type distribution for balanced nutrition
    - Shows calorie target achievement (when applicable)

    Pet-Specific Summary (when pet_id provided):
    - Total daily calories vs target (if set)
    - Target achievement percentage
    - Meal distribution by type
    - Today's feeding timeline

    Group-Wide Summary (when group_id provided):
    - Number of different pets fed today
    - Total group feeding activity
    - Meal type distribution across all pets
    - Feeder activity summary

    Returns:
    - Today's meal summary with key statistics
    - Meal type breakdown and feeding patterns
    - Calorie target achievement (for individual pets)
    - Real-time feeding status for daily care coordination
    """
    try:
        filters = MealQueryFilters(
            pet_id=pet_id,
            group_id=group_id,
            fed_by=fed_by,
            meal_type=meal_type,
        )

        today_summary = await meal_service.get_today_meals(filters, current_user.id)
        return {
            "status": 1,
            "data": today_summary.model_dump(),
            "message": f"Today's meal summary retrieved for {today_summary.date}",
        }
    except Exception as e:
        raise e


@router.get("/summary", response_model=dict)
async def get_meal_summary_statistics(
    current_user: Annotated[UserInfo, Depends(get_current_user)],
    pet_id: Optional[str] = Query(None, description="Generate summary for a specific pet"),
    group_id: Optional[str] = Query(None, description="Generate summary for all pets in a group"),
    date_from: str = Query(..., description="Start date for summary period (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date for summary period (YYYY-MM-DD)"),
    fed_by: Optional[str] = Query(None, description="Filter statistics by specific feeder"),
    meal_type: Optional[MealType] = Query(None, description="Filter statistics by meal type"),
) -> dict:
    """
    Generates comprehensive statistical summaries of feeding patterns and nutritional intake.

    Authorization: Appropriate access rights required based on query parameters

    This endpoint provides detailed statistical analysis of feeding patterns over specified
    time periods, supporting health assessment and care optimization decisions.

    Required Parameters:
    - date_from: Start date for analysis period (YYYY-MM-DD)
    - date_to: End date for analysis period (YYYY-MM-DD)
    - Either pet_id or group_id must be provided

    Optional Filters:
    - fed_by: Analyze activity by specific feeder
    - meal_type: Focus statistics on specific meal types

    Statistical Analysis Includes:
    - Basic metrics: total meals, calories, weight consumed
    - Daily averages: meals per day, calories per day
    - Nutritional breakdown: protein, fat, moisture, carbohydrates
    - Feeding patterns: meal type distribution over time
    - Activity analysis: most active feeders, most used foods
    - Goal achievement: target vs actual intake analysis

    Time Period Analysis:
    - Calculates accurate daily averages across the period
    - Handles varying period lengths appropriately
    - Provides trend indicators for pattern recognition
    - Supports comparative analysis across different periods

    Usage Examples:
    - Weekly nutrition report: ?pet_id=pet123&date_from=2025-01-08&date_to=2025-01-15
    - Monthly group overview: ?group_id=group456&date_from=2025-01-01&date_to=2025-01-31
    - Feeder performance: ?group_id=group456&fed_by=user789&date_from=2025-01-01

    Returns:
    - Comprehensive feeding statistics with daily averages
    - Nutritional intake analysis and goal achievement metrics
    - Feeding pattern insights and trend indicators
    - Activity summaries for feeders and food preferences
    """
    try:
        filters = MealQueryFilters(
            pet_id=pet_id,
            group_id=group_id,
            fed_by=fed_by,
            date_from=date_from,
            date_to=date_to,
            meal_type=meal_type,
        )

        statistics = await meal_service.get_meal_statistics(filters, current_user.id)
        return {
            "status": 1,
            "data": statistics.model_dump(),
            "message": f"Meal statistics generated for period {date_from} to {date_to}",
        }
    except Exception as e:
        raise e
