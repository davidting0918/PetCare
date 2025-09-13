from typing import Annotated

from fastapi import APIRouter, Depends

from backend.models.user import CreateUserRequest, ResetPasswordRequest, UpdateUserInfoRequest, User
from backend.services.auth_service import get_current_user, verify_api_key
from backend.services.user_service import UserService

router = APIRouter(prefix="/user", tags=["user"])

user_service = UserService()


# Private endpoint - API key required
@router.post("/create")
async def create_user(request: CreateUserRequest, api_key: Annotated[dict, Depends(verify_api_key)]) -> dict:
    """
    Create user - private endpoint, API key required
    api key only provide to frontend,
    """
    try:
        user_info = await user_service.create_user(request, api_key)
        return {"status": 1, "data": user_info.model_dump(), "message": "User registered successfully"}
    except Exception as e:
        raise e


# Private endpoint - JWT token required
@router.get("/me")
async def get_current_user_info(current_user: Annotated[User, Depends(get_current_user)]) -> dict:
    """
    Get current user info - requires JWT authentication
    Returns complete information of the authenticated user
    """
    try:
        return {
            "status": 1,
            "data": current_user.model_dump(),
            "message": f"Welcome, {current_user.name}!",
        }
    except Exception as e:
        raise e


@router.post("/update")
async def update_user_info(
    request: UpdateUserInfoRequest, current_user: Annotated[User, Depends(get_current_user)]
) -> dict:
    try:
        user_info = await user_service.update_user_info(request, current_user.id)
        return {"status": 1, "data": user_info.model_dump(), "message": "User info updated successfully"}
    except Exception as e:
        raise e


@router.post("/reset_password")
async def reset_password(
    request: ResetPasswordRequest, current_user: Annotated[User, Depends(get_current_user)]
) -> dict:
    try:
        user_info = await user_service.reset_password(request, current_user.id)
        return {"status": 1, "data": user_info.model_dump(), "message": "Password reset successfully"}
    except Exception as e:
        raise e
