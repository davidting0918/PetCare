"""Food catalog endpoints — GET/POST only, no path params.

Photo upload uses multipart with food_id as a Form field alongside the file.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile

from backend.core.db_manager import get_db
from backend.models.food import (
    CreateFoodRequest,
    DeleteFoodRequest,
    FoodDetails,
    FoodSummary,
    FoodType,
    TargetPet,
    UpdateFoodRequest,
)
from backend.models.user import User
from backend.services.auth_service import get_current_user
from backend.services.food_service import FoodService

router = APIRouter(prefix="/food", tags=["food"])


def get_food_service() -> FoodService:
    return FoodService(get_db())


@router.post("/create", response_model=FoodDetails)
async def create_food(
    body: CreateFoodRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[FoodService, Depends(get_food_service)],
) -> FoodDetails:
    return await service.create_food(body, user.id)


@router.get("/details", response_model=FoodDetails)
async def food_details(
    food_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[FoodService, Depends(get_food_service)],
) -> FoodDetails:
    return await service.get_food_details(food_id, user.id)


@router.get("/list", response_model=list[FoodSummary])
async def list_foods(
    group_id: str,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[FoodService, Depends(get_food_service)],
    keyword: str | None = None,
    food_type: FoodType | None = None,
    target_pet: TargetPet | None = None,
) -> list[FoodSummary]:
    return await service.search_foods(group_id, user.id, keyword, food_type, target_pet)


@router.post("/update", response_model=FoodDetails)
async def update_food(
    body: UpdateFoodRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[FoodService, Depends(get_food_service)],
) -> FoodDetails:
    return await service.update_food(body, user.id)


@router.post("/delete")
async def delete_food(
    body: DeleteFoodRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[FoodService, Depends(get_food_service)],
) -> dict:
    return await service.delete_food(body.food_id, user.id)


@router.post("/photo/upload")
async def upload_food_photo(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[FoodService, Depends(get_food_service)],
    food_id: Annotated[str, Form(...)],
    file: UploadFile = File(..., description="Food photo (JPEG / PNG / GIF / WebP, ≤5 MB)"),
) -> dict:
    return await service.upload_food_photo(food_id, user.id, file)
