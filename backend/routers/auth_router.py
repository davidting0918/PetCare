from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from backend.models.auth import EmailAuthRequest, GoogleAuthRequest, RefreshTokenRequest
from backend.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
auth_service = AuthService()


@router.post("/email/login")
async def validate_email_login_route(request: EmailAuthRequest) -> dict:
    user = await auth_service.authenticate_user(email=request.email, password=request.pwd)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    token_info = await auth_service.get_or_create_token(user.id)

    return {
        "status": 1,
        "data": {
            "access_token": token_info["access_token"],
            "token_type": token_info["token_type"],
            "refresh_token": token_info["refresh_token"],
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "picture": user.picture if hasattr(user, "picture") else None,
            },
        },
        "message": "Email login successful",
    }


@router.post("/google/login")
async def validate_google_login_route(request: GoogleAuthRequest) -> dict:
    user = await auth_service.authenticate_google_user(request.token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google authorization code")

    token_info = await auth_service.get_or_create_token(user.id)

    return {
        "status": 1,
        "data": {
            "access_token": token_info["access_token"],
            "token_type": token_info["token_type"],
            "refresh_token": token_info["refresh_token"],
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "picture": user.picture if hasattr(user, "picture") else None,
            },
        },
        "message": "Google login successful",
    }


@router.post("/token/refresh")
async def refresh_token_route(request: RefreshTokenRequest) -> dict:
    token_info = await auth_service.refresh_access_token(request.refresh_token)

    return {
        "status": 1,
        "data": {
            "access_token": token_info["access_token"],
            "token_type": token_info["token_type"],
            "refresh_token": token_info["refresh_token"],
        },
        "message": "Token refreshed successfully",
    }


@router.post("/access_token")
async def get_access_token_route(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]) -> dict:
    user = await auth_service.authenticate_user(name=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")

    token_info = await auth_service.get_or_create_token(user.id)

    return {
        "access_token": token_info["access_token"],
        "token_type": token_info["token_type"],
        "message": "Access token generated successfully",
    }
