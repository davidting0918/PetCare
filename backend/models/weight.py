from datetime import datetime as dt
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

weight_table = "weight_records"


# ================== Core Models ==================


class WeightRecord(BaseModel):
    """
    Core WeightRecord model representing a weight measurement for a pet.
    Each record captures the weight at a specific point in time.
    """

    id: str  # Format: wt_{8-char-id}, e.g., "wt_abc12345"
    pet_id: str
    weight: float = Field(..., ge=0.1, le=200, description="Weight in kg")
    user_id: str  # User who recorded this weight
    timestamp: dt  # When the weight was measured
    notes: Optional[str] = Field(None, max_length=500)
    created_at: dt
    updated_at: dt
    is_active: bool = True


# ================== Request Models ==================


class CreateWeightRecordRequest(BaseModel):
    """Request to create a new weight record"""

    pet_id: str = Field(..., description="ID of the pet being weighed")
    weight: float = Field(..., ge=0.1, le=200, description="Weight in kg")
    timestamp: dt = Field(
        dt.now(), description="When the weight was measured (defaults to current time if not provided)"
    )
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes about the measurement")


class UpdateWeightRecordRequest(BaseModel):
    """Request to update an existing weight record (partial update)"""

    weight: Optional[float] = Field(None, ge=0.1, le=200, description="Updated weight in kg")
    timestamp: Optional[dt] = Field(dt.now(), description="Updated measurement time")
    notes: Optional[str] = Field(None, max_length=500, description="Updated notes")


class OrderBy(str, Enum):
    """Supported order by fields for weight record search"""

    TIMESTAMP = "timestamp"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"


class OrderDirection(str, Enum):
    """Sort order direction"""

    ASC = "asc"
    DESC = "desc"


class SearchWeightRecordsRequest(BaseModel):
    """Request to search weight records with various filters"""

    pet_id: str = Field(..., description="Filter by pet ID (required)")
    user_id: Optional[str] = Field(None, description="Filter by user who recorded the weight")
    start: Optional[dt] = Field(None, description="Start of timestamp range (inclusive)")
    end: Optional[dt] = Field(None, description="End of timestamp range (inclusive)")
    order_by: OrderBy = Field(OrderBy.TIMESTAMP, description="Field to sort by")
    order_direction: OrderDirection = Field(OrderDirection.DESC, description="Sort direction")
    page: int = Field(1, ge=1, description="Page number (starts from 1)")
    number: int = Field(50, ge=1, le=500, description="Number of records per page")


# ================== Response Models ==================


class WeightRecordInfo(BaseModel):
    """Basic weight record information for list displays"""

    id: str
    pet_id: str
    weight: float
    user_id: str
    timestamp: dt
    created_at: dt
    updated_at: dt
    notes: Optional[str]


class WeightRecordDetails(BaseModel):
    """Comprehensive weight record information for detailed views"""

    id: str
    pet_id: str
    pet_name: str
    pet_type: str
    weight: float
    user_id: str
    user_name: str
    timestamp: dt
    notes: Optional[str]
    created_at: dt
    updated_at: dt
    is_active: bool


class SearchWeightRecordsResponse(BaseModel):
    """Response for weight record search with pagination info"""

    records: list[WeightRecordInfo]
    total: int
    page: int
    number: int
    total_pages: int
