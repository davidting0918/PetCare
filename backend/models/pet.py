from datetime import datetime as dt
from datetime import timezone as tz
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

# Database collections
pet_collection = "pets"
pet_photo_collection = "pet_photos"


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
    created_at: int
    updated_at: int
    is_active: bool = True
    notes: Optional[str] = Field(None, max_length=1000)

    @property
    def age(self) -> int:
        if not self.birth_date:
            return None

        birth_dt = dt.fromtimestamp(self.birth_date, tz.utc)
        current_dt = dt.now(tz.utc)
        return int((current_dt - birth_dt).days / 365.25)


class PetPhoto(BaseModel):
    """
    Pet photo information and metadata.
    Stores reference information for pet photos in local storage.
    """

    pet_id: str
    filename: str  # Original filename for user reference
    file_path: str  # Path to file in local storage
    file_size: int  # Size in bytes
    content_type: str  # MIME type (image/jpeg, image/png, etc.)
    uploaded_by: str  # User who uploaded the photo
    uploaded_at: int
    is_active: bool = True


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
    is_spayed: Optional[bool] = None
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

    target_group_id: str


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
    current_group_name: Optional[str]
    created_at: int
    is_owned_by_user: bool  # True if current user is the owner
    user_permission: str  # "owner", "member", "viewer"


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
    age_months: Optional[int]  # Calculated from birth_date
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
    current_group_name: Optional[str]

    # Metadata
    created_at: int
    updated_at: int
    notes: Optional[str]

    # User Context
    is_owned_by_user: bool
    user_permission: str  # "owner", "member", "viewer"


class GroupAssignmentInfo(BaseModel):
    """Information about pet's current group assignment"""

    pet_id: str
    pet_name: str
    group_id: Optional[str]
    current_group_name: Optional[str]
    member_count: Optional[int]
    user_role_in_group: Optional[str]  # "creator", "member", "viewer"
    assigned_at: Optional[int]


class PetPhotoInfo(BaseModel):
    """Pet photo metadata information"""

    pet_id: str
    filename: str
    file_size: int
    content_type: str
    uploaded_by: str
    uploaded_by_name: str
    uploaded_at: int
