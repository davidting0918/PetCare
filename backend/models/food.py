from datetime import datetime as dt
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

food_table = "foods"
food_photo_table = "food_photos"

# ================== Table Definitions for PostgreSQL ==================
# These replace MongoDB collection names for SQL database operations


class FoodType(str, Enum):
    """Food preparation types"""

    WET_FOOD = "wet_food"
    DRY_FOOD = "dry_food"


class TargetPet(str, Enum):
    """Target pet species for the food"""

    DOG = "dog"
    CAT = "cat"
    BIRD = "bird"
    FISH = "fish"
    RABBIT = "rabbit"
    OTHER = "other"


# ================== Core Models ==================


class Food(BaseModel):
    """
    Food represents a food item in a group's shared food database.
    Each group maintains its own independent food collection.
    """

    id: str
    creator_id: str
    group_id: str  # ID of the group this food belongs to
    brand: str = Field(..., min_length=1, max_length=100)
    product_name: str = Field(..., min_length=1, max_length=100)
    food_type: FoodType
    target_pet: TargetPet
    unit_weight: float = Field(..., gt=0, le=5000)  # Weight in grams of one unit (can, cup, etc.)

    # Nutritional information (per 100g)
    calories: float = Field(..., ge=0, le=1000)  # in 100g
    protein: float = Field(..., ge=0, le=100)  # in percentage
    fat: float = Field(..., ge=0, le=100)  # in percentage
    moisture: float = Field(..., ge=0, le=100)  # in percentage
    carbohydrate: float = Field(..., ge=0, le=100)  # in percentage

    created_at: dt = Field(default_factory=dt.now)
    updated_at: dt = Field(default_factory=dt.now)
    is_active: bool = True
    photo_url: Optional[str] = ""


# ================== Request Models ==================


class CreateFoodRequest(BaseModel):
    """Request to create a new food item in group database"""

    brand: str = Field(..., min_length=1, max_length=100)
    product_name: str = Field(..., min_length=1, max_length=100)
    food_type: FoodType
    target_pet: TargetPet
    unit_weight: float = Field(..., gt=0, le=5000)

    # Nutritional information (per 100g)
    calories: float = Field(..., ge=0, le=1000)
    protein: float = Field(..., ge=0, le=100)
    fat: float = Field(..., ge=0, le=100)
    moisture: float = Field(..., ge=0, le=100)
    carbohydrate: float = Field(..., ge=0, le=100)


class UpdateFoodRequest(BaseModel):
    """Request to update food information (partial update)"""

    brand: Optional[str] = Field(None, min_length=1, max_length=100)
    product_name: Optional[str] = Field(None, min_length=1, max_length=100)
    food_type: Optional[FoodType] = None
    target_pet: Optional[TargetPet] = None
    unit_weight: Optional[float] = Field(None, gt=0, le=5000)

    # Nutritional information (per 100g) - all optional
    calories: Optional[float] = Field(None, ge=0, le=1000)
    protein: Optional[float] = Field(None, ge=0, le=100)
    fat: Optional[float] = Field(None, ge=0, le=100)
    moisture: Optional[float] = Field(None, ge=0, le=100)
    carbohydrate: Optional[float] = Field(None, ge=0, le=100)


# ================== Response Models ==================


class FoodInfo(BaseModel):
    """Basic food information for lists and selection interfaces"""

    id: str
    brand: str
    product_name: str
    food_type: FoodType
    target_pet: TargetPet
    unit_weight: float
    calories: float
    protein: float
    fat: float
    moisture: float
    carbohydrate: float
    has_photo: bool
    created_at: dt
    updated_at: dt
    group_id: str
    creator_id: str


class FoodDetails(BaseModel):
    """Comprehensive food information for detailed views"""

    id: str
    brand: str
    product_name: str
    food_type: FoodType
    target_pet: TargetPet
    unit_weight: float

    # Complete nutritional breakdown
    calories: float
    protein: float
    fat: float
    moisture: float
    carbohydrate: float

    # Meta information
    created_at: dt
    updated_at: dt
    group_id: str
    group_name: str
    has_photo: bool
    creator_id: str
    creator_name: str

    # Calculated convenience fields
    calories_per_unit: float  # Calories in one unit based on unit weight


class FoodSearchResult(BaseModel):
    """Food search result with relevance context"""

    id: str
    brand: str
    product_name: str
    food_type: FoodType
    target_pet: TargetPet
    unit_weight: float
    calories: float
    has_photo: bool
    group_id: str
    group_name: str
