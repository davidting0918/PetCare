from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from backend.models.auth import EmailAuthRequest, GoogleAuthRequest
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
            "user": {"id": user.id, "email": user.email, "name": user.name},
        },
        "message": "Email login successful",
    }


@router.post("/google/login")
async def validate_google_login_route(request: GoogleAuthRequest) -> dict:
    user = await auth_service.authenticate_google_user(request.code, request.redirect_uri)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google authorization code")

    token_info = await auth_service.get_or_create_token(user.id)

    return {
        "status": 1,
        "data": {
            "access_token": token_info["access_token"],
            "token_type": token_info["token_type"],
            "user": {"id": user.id, "email": user.email, "name": user.name},
        },
        "message": "Google login successful",
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
