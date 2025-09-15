from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

food_table = "foods"


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
    group_id: str  # ID of the group this food belongs to
    brand: str = Field(..., min_length=1, max_length=100)
    product_name: str = Field(..., min_length=1, max_length=100)
    food_type: FoodType
    target_pet: TargetPet
    unit_weight_g: float = Field(..., gt=0, le=5000)  # Weight in grams of one unit (can, cup, etc.)

    # Nutritional information (per 100g)
    calories_per_100g: float = Field(..., ge=0, le=1000)
    protein_percentage: float = Field(..., ge=0, le=100)
    fat_percentage: float = Field(..., ge=0, le=100)
    moisture_percentage: float = Field(..., ge=0, le=100)
    carbohydrate_percentage: float = Field(..., ge=0, le=100)

    created_at: int
    updated_at: int
    is_active: bool = True


class FoodPhoto(BaseModel):
    """
    FoodPhoto stores metadata about a food's identification picture.
    The actual file is stored locally using food_id as filename.
    Uses food_id as the photo ID for simplified storage (1:1 relationship).
    """

    id: str  # Same as food_id for simplified 1:1 relationship
    filename: str
    file_path: str  # Local path to the stored file
    file_size: int  # Size in bytes
    content_type: str  # MIME type
    uploaded_by: str  # User ID who uploaded the photo
    uploaded_at: int
    is_active: bool = True


# ================== Request Models ==================


class CreateFoodRequest(BaseModel):
    """Request to create a new food item in group database"""

    brand: str = Field(..., min_length=1, max_length=100)
    product_name: str = Field(..., min_length=1, max_length=100)
    food_type: FoodType
    target_pet: TargetPet
    unit_weight_g: float = Field(..., gt=0, le=5000)

    # Nutritional information (per 100g)
    calories_per_100g: float = Field(..., ge=0, le=1000)
    protein_percentage: float = Field(..., ge=0, le=100)
    fat_percentage: float = Field(..., ge=0, le=100)
    moisture_percentage: float = Field(..., ge=0, le=100)
    carbohydrate_percentage: float = Field(..., ge=0, le=100)


class UpdateFoodRequest(BaseModel):
    """Request to update food information (partial update)"""

    brand: Optional[str] = Field(None, min_length=1, max_length=100)
    product_name: Optional[str] = Field(None, min_length=1, max_length=100)
    food_type: Optional[FoodType] = None
    target_pet: Optional[TargetPet] = None
    unit_weight_g: Optional[float] = Field(None, gt=0, le=5000)

    # Nutritional information (per 100g) - all optional
    calories_per_100g: Optional[float] = Field(None, ge=0, le=1000)
    protein_percentage: Optional[float] = Field(None, ge=0, le=100)
    fat_percentage: Optional[float] = Field(None, ge=0, le=100)
    moisture_percentage: Optional[float] = Field(None, ge=0, le=100)
    carbohydrate_percentage: Optional[float] = Field(None, ge=0, le=100)


# ================== Response Models ==================


class FoodInfo(BaseModel):
    """Basic food information for lists and selection interfaces"""

    id: str
    brand: str
    product_name: str
    food_type: FoodType
    target_pet: TargetPet
    unit_weight_g: float
    calories_per_100g: float
    protein_percentage: float
    fat_percentage: float
    has_photo: bool
    created_at: int
    group_id: str
    group_name: str


class FoodDetails(BaseModel):
    """Comprehensive food information for detailed views"""

    id: str
    brand: str
    product_name: str
    food_type: FoodType
    target_pet: TargetPet
    unit_weight_g: float

    # Complete nutritional breakdown
    calories_per_100g: float
    protein_percentage: float
    fat_percentage: float
    moisture_percentage: float
    carbohydrate_percentage: float

    # Meta information
    created_at: int
    updated_at: int
    group_id: str
    group_name: str
    has_photo: bool

    # Calculated convenience fields
    calories_per_unit: float  # Calories in one unit based on unit weight


class FoodPhotoInfo(BaseModel):
    """Metadata about a food's identification photo"""

    id: str  # Same as food_id (1:1 relationship)
    filename: str
    file_size: int
    content_type: str
    uploaded_by: str
    uploaded_by_name: str
    uploaded_at: int


class FoodSearchResult(BaseModel):
    """Food search result with relevance context"""

    id: str
    brand: str
    product_name: str
    food_type: FoodType
    target_pet: TargetPet
    unit_weight_g: float
    calories_per_100g: float
    has_photo: bool
    group_id: str
    group_name: str
    # Could add relevance_score in the future for search ranking
