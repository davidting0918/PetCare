"""Food catalog — group-scoped (each group maintains its own foods list).

Each `Food` row stores nutritional values quoted *per 100 g* of the product:
calories (kcal), protein/fat/moisture/carbohydrate (percent by mass). The DB
enforces `protein + fat + moisture + carbohydrate <= 105` (5 percentage-point
tolerance for measurement noise). `unit_weight` is how many grams one "natural
unit" of the product weighs (e.g. one can, one cup) — used by the meal layer
to translate a "2 cups" log into grams.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


food_table = "foods"


class FoodType(str, Enum):
    WET_FOOD = "wet_food"
    DRY_FOOD = "dry_food"
    OTHER = "other"


class TargetPet(str, Enum):
    DOG = "dog"
    CAT = "cat"
    BIRD = "bird"
    FISH = "fish"
    RABBIT = "rabbit"
    OTHER = "other"


# ────── Stored row shape ──────


class Food(BaseModel):
    id: str
    group_id: str
    creator_id: str | None = None
    brand: str = Field(..., min_length=1, max_length=100)
    product_name: str = Field(..., min_length=1, max_length=100)
    food_type: FoodType
    target_pet: TargetPet
    unit_weight: float = Field(..., gt=0, le=5000)
    calories: float = Field(..., ge=0, le=1000)
    protein: float = Field(..., ge=0, le=100)
    fat: float = Field(..., ge=0, le=100)
    moisture: float = Field(..., ge=0, le=100)
    carbohydrate: float = Field(..., ge=0, le=100)
    photo_url: str | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


# ────── Request DTOs ──────


class CreateFoodRequest(BaseModel):
    group_id: str
    brand: str = Field(..., min_length=1, max_length=100)
    product_name: str = Field(..., min_length=1, max_length=100)
    food_type: FoodType
    target_pet: TargetPet
    unit_weight: float = Field(..., gt=0, le=5000)
    calories: float = Field(..., ge=0, le=1000)
    protein: float = Field(..., ge=0, le=100)
    fat: float = Field(..., ge=0, le=100)
    moisture: float = Field(..., ge=0, le=100)
    carbohydrate: float = Field(..., ge=0, le=100)


class UpdateFoodRequest(BaseModel):
    food_id: str
    brand: str | None = Field(None, min_length=1, max_length=100)
    product_name: str | None = Field(None, min_length=1, max_length=100)
    food_type: FoodType | None = None
    target_pet: TargetPet | None = None
    unit_weight: float | None = Field(None, gt=0, le=5000)
    calories: float | None = Field(None, ge=0, le=1000)
    protein: float | None = Field(None, ge=0, le=100)
    fat: float | None = Field(None, ge=0, le=100)
    moisture: float | None = Field(None, ge=0, le=100)
    carbohydrate: float | None = Field(None, ge=0, le=100)


class DeleteFoodRequest(BaseModel):
    food_id: str


# ────── Response DTOs ──────


class FoodSummary(BaseModel):
    """Lightweight row for list / search endpoints."""

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
    photo_url: str | None = None
    group_id: str
    creator_id: str | None = None
    created_at: datetime
    updated_at: datetime


class FoodDetails(BaseModel):
    """Full food profile with calorie-per-unit convenience field."""

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
    calories_per_unit: float
    photo_url: str | None = None
    group_id: str
    group_name: str
    creator_id: str | None = None
    creator_name: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
