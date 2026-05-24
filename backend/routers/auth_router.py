"""Auth endpoints — OAuth-only (Apple + Google), GET/POST only, no path params."""

from typing import Annotated

from fastapi import APIRouter, Depends

from backend.models.auth import (
    AppleLoginRequest,
    GoogleLoginRequest,
    LoginResponse,
    RefreshRequest,
    TokenPair,
)
from backend.models.user import User
from backend.services.auth_service import AuthService, get_auth_service, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google/login", response_model=LoginResponse)
async def google_login(
    body: GoogleLoginRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> LoginResponse:
    return await service.login_with_google(body.token)


@router.post("/apple/login", response_model=LoginResponse)
async def apple_login(
    body: AppleLoginRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> LoginResponse:
    return await service.login_with_apple(
        identity_token=body.identity_token,
        email=str(body.email) if body.email else None,
        full_name=body.full_name,
    )


@router.post("/token/refresh", response_model=TokenPair)
async def refresh_token(
    body: RefreshRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> TokenPair:
    return await service.refresh_tokens(body.refresh_token)


@router.post("/logout")
async def logout(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> dict:
    await service.revoke_all_for_user(user.id)
    return {"id": user.id, "logged_out": True}
