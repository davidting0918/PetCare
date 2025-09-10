from typing import Annotated

from fastapi import APIRouter, Depends

from backend.services.auth_service import AuthService, get_current_user, verify_api_key

from backend.models.user import CreateUserRequest, User
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