"""Weight tracking model + DTOs.

One row per measurement. Pets accumulate dozens to hundreds of these over a
lifetime, so list endpoints page through them rather than returning everything.

Ownership: the user who recorded it (`user_id`) is the only one allowed to
edit or soft-delete the row. Any group member can view.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


weight_table = "weight_records"


class WeightOrderBy(str, Enum):
    TIMESTAMP = "timestamp"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"


class OrderDirection(str, Enum):
    ASC = "asc"
    DESC = "desc"


# ────── Stored row shape ──────


class WeightRecord(BaseModel):
    id: str  # 'wt_' + 8 hex
    pet_id: str
    user_id: str
    weight: float = Field(..., ge=0.1, le=200)
    timestamp: datetime
    notes: str | None = Field(None, max_length=500)
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


# ────── Request DTOs ──────


class CreateWeightRequest(BaseModel):
    pet_id: str
    weight: float = Field(..., ge=0.1, le=200)
    timestamp: datetime | None = None  # defaults to "now" in the service
    notes: str | None = Field(None, max_length=500)


class UpdateWeightRequest(BaseModel):
    weight_id: str
    weight: float | None = Field(None, ge=0.1, le=200)
    timestamp: datetime | None = None
    notes: str | None = Field(None, max_length=500)


class DeleteWeightRequest(BaseModel):
    weight_id: str


# ────── Response DTOs ──────


class WeightSummary(BaseModel):
    """List-row shape. `user_name` is denormalized via JOIN for display."""

    id: str
    pet_id: str
    weight: float
    user_id: str
    user_name: str
    timestamp: datetime
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class WeightDetails(BaseModel):
    id: str
    pet_id: str
    pet_name: str
    pet_type: str
    weight: float
    user_id: str
    user_name: str
    timestamp: datetime
    notes: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class WeightListResponse(BaseModel):
    records: list[WeightSummary]
    total: int
    page: int
    number: int
    total_pages: int
