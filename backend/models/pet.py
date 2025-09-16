from datetime import datetime as dt
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

pet_table = "pets"
pet_photo_table = "pet_photos"


class PetType(str, Enum):
    """Types of pets supported by the system"""

    DOG = "dog"
    CAT = "cat"
    BIRD = "bird"
    FISH = "fish"
    RABBIT = "rabbit"
    OTHER = "other"


class PetGender(str, Enum):
    """Pet gender options"""

    MALE = "male"
    FEMALE = "female"
    UNKNOWN = "unknown"


# ================== Core Models ==================


class Pet(BaseModel):
    """
    Core Pet model representing a pet owned by a user and assigned to a group.
    Follows individual ownership with group assignment model.
    """

    id: str

    # Basic Information
    name: str = Field(..., min_length=1, max_length=50)
    pet_type: PetType = PetType.CAT
    breed: Optional[str] = Field(None, max_length=100)
    gender: PetGender = PetGender.UNKNOWN

    # Physical Characteristics
    birth_date: Optional[int] = None  # Unix timestamp
    current_weight_kg: Optional[float] = Field(None, ge=0.1, le=200)
    target_weight_kg: Optional[float] = Field(None, ge=0.1, le=200)
    height_cm: Optional[float] = Field(None, ge=1, le=200)

    # Health Information
    is_spayed: Optional[bool] = None
    microchip_id: Optional[str] = Field(None, max_length=50)

    # Care Preferences
    daily_calorie_target: Optional[int] = Field(None, ge=10, le=5000)

    # Ownership and Assignment
    owner_id: str  # User who owns this pet
    group_id: Optional[str] = None  # Group currently assigned to

    # Metadata
    created_at: dt
    updated_at: dt
    is_active: bool = True
    photo_url: Optional[str] = ""
    notes: Optional[str] = Field(None, max_length=1000)

    @property
    def age(self) -> int:
        if not self.birth_date:
            return None

        birth_dt = self.birth_date
        current_dt = dt.now()
        return int((current_dt - birth_dt).days / 365.25)


# ================== Request Models ==================


class CreatePetRequest(BaseModel):
    """Request to create a new pet"""

    name: str = Field(..., min_length=1, max_length=50)
    pet_type: PetType
    breed: Optional[str] = Field(None, max_length=100)
    gender: PetGender = PetGender.UNKNOWN
    birth_date: Optional[int] = None
    current_weight_kg: Optional[float] = Field(None, ge=0.1, le=200)
    target_weight_kg: Optional[float] = Field(None, ge=0.1, le=200)
    height_cm: Optional[float] = Field(None, ge=1, le=200)
    is_spayed: Optional[bool] = False
    microchip_id: Optional[str] = Field(None, max_length=50)
    daily_calorie_target: Optional[int] = Field(None, ge=50, le=5000)
    notes: Optional[str] = Field(None, max_length=1000)


class UpdatePetRequest(BaseModel):
    """Request to update pet information"""

    name: Optional[str] = Field(None, min_length=1, max_length=50)
    breed: Optional[str] = Field(None, max_length=100)
    gender: Optional[PetGender] = None
    birth_date: Optional[int] = None
    current_weight_kg: Optional[float] = Field(None, ge=0.1, le=200)
    target_weight_kg: Optional[float] = Field(None, ge=0.1, le=200)
    height_cm: Optional[float] = Field(None, ge=1, le=200)
    is_spayed: Optional[bool] = None
    microchip_id: Optional[str] = Field(None, max_length=50)
    daily_calorie_target: Optional[int] = Field(None, ge=50, le=5000)
    notes: Optional[str] = Field(None, max_length=1000)


class AssignPetToGroupRequest(BaseModel):
    """Request to assign pet to a different group"""

    group_id: str


# ================== Response Models ==================


class PetInfo(BaseModel):
    """Basic pet information for list displays"""

    id: str
    name: str
    pet_type: PetType
    breed: Optional[str]
    gender: PetGender
    current_weight_kg: Optional[float]
    owner_id: str
    owner_name: str
    group_id: Optional[str]
    group_name: Optional[str]
    created_at: dt
    updated_at: dt
    is_active: bool


class PetDetails(BaseModel):
    """Comprehensive pet information including all details"""

    # Basic Information
    id: str
    name: str
    pet_type: PetType
    breed: Optional[str]
    gender: PetGender

    # Physical Characteristics
    birth_date: Optional[int]
    age: Optional[float]
    current_weight_kg: Optional[float]
    target_weight_kg: Optional[float]
    height_cm: Optional[float]

    # Health Information
    is_spayed: Optional[bool]
    microchip_id: Optional[str]

    # Care Preferences
    daily_calorie_target: Optional[int]

    # Ownership and Assignment
    owner_id: str
    owner_name: str
    group_id: Optional[str]
    group_name: Optional[str]

    # Metadata
    created_at: dt
    updated_at: dt
    is_active: bool
    notes: Optional[str]


class GroupAssignmentInfo(BaseModel):
    """Information about pet's current group assignment"""

    pet_id: str
    pet_name: str
    group_id: Optional[str]
    group_name: Optional[str]
    user_role_in_group: Optional[str]  # "creator", "member", "viewer"
