"""Meal (feeding) model + DTOs.

Each meal row is an immutable snapshot of *what was eaten*. At log time we
copy the food's per-100g macros, multiply by `actual_weight_g`, and store the
absolute gram values on the meal row. Editing the source food later does NOT
retroactively change historical meals.

`serving_type` lets the client send either a count of natural units (cans,
cups) or a direct gram weight; `actual_weight_g` is what we calculate and
all macros are derived from it.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


meal_table = "meals"


class MealType(str, Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class ServingType(str, Enum):
    UNITS = "units"  # natural units (cans, cups) — multiplied by food.unit_weight
    GRAMS = "grams"  # direct gram weight


# ────── Stored row shape ──────


class Meal(BaseModel):
    id: str
    pet_id: str
    food_id: str
    user_id: str
    group_id: str
    timestamp: datetime
    meal_type: MealType | None = None
    serving_type: ServingType
    serving_amount: float
    actual_weight_g: float
    calories: float
    protein_g: float
    fat_g: float
    moisture_g: float
    carbohydrate_g: float
    notes: str | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


# ────── Request DTOs ──────


class CreateMealRequest(BaseModel):
    pet_id: str
    food_id: str
    serving_type: ServingType
    serving_amount: float = Field(..., gt=0, le=10000)
    timestamp: datetime | None = None  # defaults to "now" in service
    meal_type: MealType | None = None
    notes: str | None = Field(None, max_length=500)


class UpdateMealRequest(BaseModel):
    meal_id: str
    food_id: str | None = None
    timestamp: datetime | None = None
    meal_type: MealType | None = None
    serving_type: ServingType | None = None
    serving_amount: float | None = Field(None, gt=0, le=10000)
    notes: str | None = Field(None, max_length=500)


class DeleteMealRequest(BaseModel):
    meal_id: str


# ────── Response DTOs ──────


class MealSummary(BaseModel):
    """Lightweight row for list endpoints."""

    id: str
    pet_id: str
    pet_name: str
    food_id: str
    food_brand: str
    food_product_name: str
    user_id: str
    fed_by_name: str
    group_id: str
    timestamp: datetime
    meal_type: MealType | None = None
    serving_type: ServingType
    serving_amount: float
    actual_weight_g: float
    calories: float
    created_at: datetime
    updated_at: datetime


class MealDetails(BaseModel):
    id: str
    pet_id: str
    pet_name: str
    food_id: str
    food_brand: str
    food_product_name: str
    user_id: str
    fed_by_name: str
    group_id: str
    group_name: str
    timestamp: datetime
    meal_type: MealType | None = None
    serving_type: ServingType
    serving_amount: float
    actual_weight_g: float
    calories: float
    protein_g: float
    fat_g: float
    moisture_g: float
    carbohydrate_g: float
    notes: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TodayMealsResponse(BaseModel):
    """Today's totals + the meal rows themselves so the client can render in one shot."""

    date: str  # YYYY-MM-DD (the day the totals are scoped to)
    total_meals: int
    total_calories: float
    total_weight_g: float
    breakfast_count: int
    lunch_count: int
    dinner_count: int
    snack_count: int
    pet_id: str | None = None
    pet_name: str | None = None
    daily_calorie_target: int | None = None
    calorie_target_percentage: float | None = None
    group_id: str | None = None
    pets_fed_count: int | None = None
    meals: list[MealSummary]


class MealStatistics(BaseModel):
    date_from: str
    date_to: str
    total_days: int
    total_meals: int
    total_calories: float
    total_weight_g: float
    average_meals_per_day: float
    average_calories_per_day: float
    average_protein_g_per_day: float
    average_fat_g_per_day: float
    average_moisture_g_per_day: float
    average_carbohydrate_g_per_day: float
    meal_type_counts: dict[str, int]
