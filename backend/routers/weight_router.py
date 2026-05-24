"""Weight tracking endpoints — GET/POST only, no path params."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends

from backend.core.db_manager import get_db
from backend.models.user import User
from backend.models.weight import (
    CreateWeightRequest,
    DeleteWeightRequest,
    OrderDirection,
    UpdateWeightRequest,
    WeightDetails,
    WeightListResponse,
    WeightOrderBy,
)
from backend.services.auth_service import get_current_user
from backend.services.weight_service import WeightService

router = APIRouter(prefix="/weight", tags=["weight"])


def get_weight_service() -> WeightService:
    return WeightService(get_db())


@router.post("/create", response_model=WeightDetails)
async def create_weight(
    body: CreateWeightRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[WeightService, Depends(get_weight_service)],
) -> WeightDetails:
    return await service.create_weight(body, user.id)


@router.post("/update", response_model=WeightDetails)
async def update_weight(
    body: UpdateWeightRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[WeightService, Depends(get_weight_service)],
) -> WeightDetails:
    return await service.update_weight(body, user.id)


@router.post("/delete")
async def delete_weight(
    body: DeleteWeightRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[WeightService, Depends(get_weight_service)],
) -> dict:
    return await service.delete_weight(body.weight_id, user.id)


@router.get("/details", response_model=WeightDetails)
async def weight_details(
    weight_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[WeightService, Depends(get_weight_service)],
) -> WeightDetails:
    return await service.get_weight_details(weight_id, user.id)


@router.get("/list", response_model=WeightListResponse)
async def list_weights(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[WeightService, Depends(get_weight_service)],
    pet_id: str | None = None,
    weight_id: str | None = None,
    recorder_id: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    order_by: WeightOrderBy = WeightOrderBy.TIMESTAMP,
    order_direction: OrderDirection = OrderDirection.DESC,
    page: int = 1,
    number: int = 50,
) -> WeightListResponse:
    return await service.list_weights(
        user_id=user.id,
        pet_id=pet_id,
        weight_id=weight_id,
        recorder_id=recorder_id,
        start=start,
        end=end,
        order_by=order_by,
        order_direction=order_direction,
        page=page,
        number=number,
    )
