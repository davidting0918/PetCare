"""Pet model + DTOs.

Pets are the central subject of the app. Each pet has one owner (user) and
lives in exactly one group at a time. Users with appropriate roles on that
group can see the pet's logs (meals, weights, medication) and (per role)
contribute to them.

Soft delete via `is_active`. Permission tag is computed per-request — see
`PetService._user_permission_for_pet`.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


pet_table = "pets"


class PetType(str, Enum):
    DOG = "dog"
    CAT = "cat"
    BIRD = "bird"
    FISH = "fish"
    RABBIT = "rabbit"
    OTHER = "other"


class PetGender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    UNKNOWN = "unknown"


# ────── Stored row shape ──────


class Pet(BaseModel):
    id: str
    name: str = Field(..., min_length=1, max_length=50)
    pet_type: PetType
    breed: str | None = Field(None, max_length=100)
    gender: PetGender
    birth_date: datetime | None = None
    current_weight_kg: float | None = Field(None, ge=0.1, le=200)
    target_weight_kg: float | None = Field(None, ge=0.1, le=200)
    height_cm: float | None = Field(None, ge=1, le=200)
    is_spayed: bool = False
    microchip_id: str | None = Field(None, max_length=50)
    daily_calorie_target: int | None = Field(None, ge=10, le=5000)
    owner_id: str
    group_id: str
    photo_url: str | None = None
    notes: str | None = Field(None, max_length=1000)
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


# ────── Request DTOs ──────


class CreatePetRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    pet_type: PetType
    gender: PetGender = PetGender.UNKNOWN
    breed: str | None = Field(None, max_length=100)
    birth_date: datetime | None = None
    current_weight_kg: float | None = Field(None, ge=0.1, le=200)
    target_weight_kg: float | None = Field(None, ge=0.1, le=200)
    height_cm: float | None = Field(None, ge=1, le=200)
    is_spayed: bool = False
    microchip_id: str | None = Field(None, max_length=50)
    daily_calorie_target: int | None = Field(None, ge=10, le=5000)
    notes: str | None = Field(None, max_length=1000)
    # Optional: which group to put the pet in. Defaults to the owner's
    # personal_group_id.
    group_id: str | None = None


class UpdatePetRequest(BaseModel):
    pet_id: str
    name: str | None = Field(None, min_length=1, max_length=50)
    breed: str | None = Field(None, max_length=100)
    gender: PetGender | None = None
    birth_date: datetime | None = None
    current_weight_kg: float | None = Field(None, ge=0.1, le=200)
    target_weight_kg: float | None = Field(None, ge=0.1, le=200)
    height_cm: float | None = Field(None, ge=1, le=200)
    is_spayed: bool | None = None
    microchip_id: str | None = Field(None, max_length=50)
    daily_calorie_target: int | None = Field(None, ge=10, le=5000)
    notes: str | None = Field(None, max_length=1000)


class DeletePetRequest(BaseModel):
    pet_id: str


class AssignPetToGroupRequest(BaseModel):
    pet_id: str
    group_id: str


# ────── Response DTOs ──────


class PetDetails(BaseModel):
    """Full pet profile + permission tag for the current viewer."""

    id: str
    name: str
    pet_type: PetType
    breed: str | None = None
    gender: PetGender
    birth_date: datetime | None = None
    age: float | None = None  # computed from birth_date at response time
    current_weight_kg: float | None = None
    target_weight_kg: float | None = None
    height_cm: float | None = None
    is_spayed: bool
    microchip_id: str | None = None
    daily_calorie_target: int | None = None
    owner_id: str
    owner_name: str
    group_id: str
    group_name: str
    photo_url: str | None = None
    notes: str | None = None
    user_permission: str  # owner | creator | member | viewer
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PetSummary(BaseModel):
    """Lightweight pet row for list endpoints."""

    id: str
    name: str
    pet_type: PetType
    breed: str | None = None
    gender: PetGender
    current_weight_kg: float | None = None
    target_weight_kg: float | None = None
    daily_calorie_target: int | None = None
    photo_url: str | None = None
    owner_id: str
    owner_name: str
    group_id: str
    group_name: str
    user_permission: str
    created_at: datetime
    updated_at: datetime


class GroupAssignmentInfo(BaseModel):
    pet_id: str
    pet_name: str
    group_id: str
    group_name: str
    user_role_in_group: str
