"""User profile endpoints — GET/POST only, no path params."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile

from backend.models.user import UpdateProfileRequest, User, UserPublic
from backend.services.auth_service import (
    UserService,
    get_current_user,
    get_user_service,
)

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me", response_model=UserPublic)
async def get_me(user: Annotated[User, Depends(get_current_user)]) -> UserPublic:
    return UserPublic.from_user(user)


@router.post("/update", response_model=UserPublic)
async def update_profile(
    body: UpdateProfileRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> UserPublic:
    updated = await service.update_profile(user.id, body)
    return UserPublic.from_user(updated)


@router.post("/photo/upload")
async def upload_user_photo(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[UserService, Depends(get_user_service)],
    file: UploadFile = File(...),
) -> dict:
    return await service.upload_user_photo(user.id, file)
