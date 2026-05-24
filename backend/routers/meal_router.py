"""Meal logging endpoints — GET/POST only, no path params."""

from typing import Annotated

from fastapi import APIRouter, Depends

from backend.core.db_manager import get_db
from backend.models.meal import (
    CreateMealRequest,
    DeleteMealRequest,
    MealDetails,
    MealStatistics,
    MealSummary,
    MealType,
    TodayMealsResponse,
    UpdateMealRequest,
)
from backend.models.user import User
from backend.services.auth_service import get_current_user
from backend.services.meal_service import MealService

router = APIRouter(prefix="/meal", tags=["meal"])


def get_meal_service() -> MealService:
    return MealService(get_db())


@router.post("/create", response_model=MealDetails)
async def create_meal(
    body: CreateMealRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MealService, Depends(get_meal_service)],
) -> MealDetails:
    return await service.create_meal(body, user.id)


@router.get("/details", response_model=MealDetails)
async def meal_details(
    meal_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MealService, Depends(get_meal_service)],
) -> MealDetails:
    return await service.get_meal_details(meal_id, user.id)


@router.post("/update", response_model=MealDetails)
async def update_meal(
    body: UpdateMealRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MealService, Depends(get_meal_service)],
) -> MealDetails:
    return await service.update_meal(body, user.id)


@router.post("/delete")
async def delete_meal(
    body: DeleteMealRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MealService, Depends(get_meal_service)],
) -> dict:
    return await service.delete_meal(body.meal_id, user.id)


@router.get("/list", response_model=list[MealSummary])
async def list_meals(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MealService, Depends(get_meal_service)],
    pet_id: str | None = None,
    group_id: str | None = None,
    fed_by: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    meal_type: MealType | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[MealSummary]:
    return await service.list_meals(
        user_id=user.id,
        pet_id=pet_id,
        group_id=group_id,
        fed_by=fed_by,
        date_from=date_from,
        date_to=date_to,
        meal_type=meal_type,
        limit=max(1, min(limit, 1000)),
        offset=max(0, offset),
    )


@router.get("/today", response_model=TodayMealsResponse)
async def today_meals(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MealService, Depends(get_meal_service)],
    pet_id: str | None = None,
    group_id: str | None = None,
    fed_by: str | None = None,
    meal_type: MealType | None = None,
    local_date: str | None = None,
) -> TodayMealsResponse:
    return await service.get_today_meals(
        user_id=user.id,
        pet_id=pet_id,
        group_id=group_id,
        fed_by=fed_by,
        meal_type=meal_type,
        local_date=local_date,
    )


@router.get("/summary", response_model=MealStatistics)
async def meal_summary(
    date_from: str,
    date_to: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[MealService, Depends(get_meal_service)],
    pet_id: str | None = None,
    group_id: str | None = None,
    fed_by: str | None = None,
    meal_type: MealType | None = None,
) -> MealStatistics:
    return await service.get_statistics(
        user_id=user.id,
        pet_id=pet_id,
        group_id=group_id,
        date_from=date_from,
        date_to=date_to,
        fed_by=fed_by,
        meal_type=meal_type,
    )
