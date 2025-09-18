from datetime import datetime as dt
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

meal_table = "meals"

# ================== Table Definitions for PostgreSQL ==================


class MealType(str, Enum):
    """Classification of meal types for better organization"""

    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class ServingType(str, Enum):
    """Types of serving input methods"""

    UNITS = "units"  # Cans, pieces, cups, etc.
    GRAMS = "grams"  # Direct weight input


# ================== Core Models ==================


class Meal(BaseModel):
    """
    Meal represents a feeding record for a pet within a group.
    Each meal captures complete feeding context with automatic nutritional calculations.
    """

    id: str
    pet_id: str
    food_id: str
    fed_by: str  # User ID who recorded the feeding
    group_id: str  # Group where the feeding was recorded

    # Feeding timing
    fed_at: dt  # When the pet was actually fed
    meal_type: Optional[MealType] = None  # Optional meal classification

    # Serving information
    serving_type: ServingType  # How the serving amount was input
    serving_amount: float  # Amount as entered by user
    actual_weight_g: float  # Calculated actual weight in grams

    # Calculated nutritional information (based on actual weight)
    calories: float  # Total calories for this feeding
    protein_g: float  # Actual protein intake in grams
    fat_g: float  # Actual fat intake in grams
    moisture_g: float  # Actual moisture intake in grams
    carbohydrate_g: float  # Actual carbohydrate intake in grams

    # Metadata
    created_at: dt = Field(default_factory=dt.now)
    updated_at: dt = Field(default_factory=dt.now)
    is_active: bool = True
    notes: Optional[str] = Field(None, max_length=500)


# ================== Request Models ==================


class CreateMealRequest(BaseModel):
    """Request to create a new meal record"""

    pet_id: str = Field(..., description="ID of the pet being fed")
    food_id: str = Field(..., description="ID of the food given to the pet")

    # Feeding timing
    fed_at: Optional[dt] = Field(default_factory=dt.now, description="When the pet was fed")
    meal_type: Optional[MealType] = Field(None, description="Type of meal")

    # Serving information
    serving_type: ServingType = Field(..., description="Method of serving input")
    serving_amount: float = Field(..., gt=0, le=10000, description="Amount served (units or grams)")

    # Optional notes
    notes: Optional[str] = Field(None, max_length=500, description="Additional feeding notes")


class UpdateMealRequest(BaseModel):
    """Request to update meal information (partial update)"""

    food_id: Optional[str] = Field(None, description="Updated food ID")
    fed_at: Optional[dt] = Field(None, description="Updated feeding time")
    meal_type: Optional[MealType] = Field(None, description="Updated meal type")
    serving_type: Optional[ServingType] = Field(None, description="Updated serving input method")
    serving_amount: Optional[float] = Field(None, gt=0, le=10000, description="Updated serving amount")
    notes: Optional[str] = Field(None, max_length=500, description="Updated notes")


# ================== Response Models ==================


class MealInfo(BaseModel):
    """Basic meal information for list displays"""

    id: str
    pet_id: str
    pet_name: str
    food_id: str
    food_name: str  # Brand + product name for display
    fed_by: str  # User ID
    fed_by_name: str  # User display name
    fed_at: dt
    meal_type: Optional[MealType]

    # Serving summary
    serving_type: ServingType
    serving_amount: float
    actual_weight_g: float

    # Key nutritional info
    calories: float

    # Metadata
    created_at: dt
    updated_at: dt
    group_id: str


class MealDetails(BaseModel):
    """Comprehensive meal information for detailed views"""

    # Basic information
    id: str
    pet_id: str
    pet_name: str
    food_id: str
    food_name: str
    food_brand: str
    food_product_name: str
    fed_by: str
    fed_by_name: str
    group_id: str
    group_name: str

    # Feeding details
    fed_at: dt
    meal_type: Optional[MealType]

    # Complete serving information
    serving_type: ServingType
    serving_amount: float  # User input amount
    actual_weight_g: float  # Calculated actual weight

    # Complete nutritional breakdown
    calories: float
    protein_g: float
    fat_g: float
    moisture_g: float
    carbohydrate_g: float

    # Metadata
    created_at: dt
    updated_at: dt
    notes: Optional[str]


class TodayMealSummary(BaseModel):
    """Summary of today's feeding for a pet or group"""

    date: str  # YYYY-MM-DD format
    total_meals: int
    total_calories: float
    total_weight_g: float

    # Per meal type breakdown
    breakfast_count: int
    lunch_count: int
    dinner_count: int
    snack_count: int

    # If for a specific pet
    pet_id: Optional[str] = None
    pet_name: Optional[str] = None
    daily_calorie_target: Optional[int] = None
    calorie_target_percentage: Optional[float] = None  # Actual vs target

    # If for a group
    group_id: Optional[str] = None
    pets_fed_count: Optional[int] = None  # Number of different pets fed today


class MealStatistics(BaseModel):
    """Statistical summary for feeding patterns and nutrition"""

    # Time period
    date_from: str
    date_to: str
    total_days: int

    # Basic statistics
    total_meals: int
    total_calories: float
    total_weight_g: float
    average_meals_per_day: float
    average_calories_per_day: float

    # Nutritional averages per day
    average_protein_g_per_day: float
    average_fat_g_per_day: float
    average_moisture_g_per_day: float
    average_carbohydrate_g_per_day: float

    # Meal type distribution
    meal_type_distribution: dict  # {"breakfast": count, "lunch": count, etc.}

    # Feeding patterns
    most_active_feeders: list  # [{"user_name": str, "meal_count": int}]
    most_used_foods: list  # [{"food_name": str, "usage_count": int}]

    # Goal achievement (if applicable)
    target_achievement: Optional[dict] = None  # {"days_on_target": int, "average_target_percentage": float}


class MealQueryFilters(BaseModel):
    """Helper model for query parameter validation"""

    pet_id: Optional[str] = None
    group_id: Optional[str] = None
    fed_by: Optional[str] = None
    date_from: Optional[str] = None  # YYYY-MM-DD format
    date_to: Optional[str] = None  # YYYY-MM-DD format
    meal_type: Optional[MealType] = None
    limit: Optional[int] = Field(50, ge=1, le=1000)
    offset: Optional[int] = Field(0, ge=0)
