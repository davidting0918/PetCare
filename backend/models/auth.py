"""Auth tokens and request/response DTOs."""

from datetime import datetime

from pydantic import BaseModel, EmailStr

from backend.models.user import UserPublic


# Stored-table name constants so service code can interpolate without scattering
# string literals.
access_token_table = "access_tokens"
refresh_token_table = "refresh_tokens"


# ────── Stored token shapes (rows in access_tokens / refresh_tokens) ──────


class StoredAccessToken(BaseModel):
    id: int
    token: str
    user_id: str
    expires_at: datetime
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class StoredRefreshToken(BaseModel):
    id: int
    token: str
    user_id: str
    access_token_id: int
    expires_at: datetime
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


# ────── Request / response DTOs ──────


class GoogleLoginRequest(BaseModel):
    """ID token returned by Google Sign-In on the iOS client."""

    token: str


class AppleFullName(BaseModel):
    given_name: str | None = None
    family_name: str | None = None

    def joined(self) -> str | None:
        parts = [p for p in (self.given_name, self.family_name) if p]
        return " ".join(parts) if parts else None


class AppleLoginRequest(BaseModel):
    """Identity token returned by Sign in with Apple on the iOS client.

    Apple sends `email` and `full_name` only on the first sign-in. The
    iOS client must forward them in this request the first time; subsequent
    sign-ins are matched by the JWT's `sub` against `users.apple_id`.
    """

    identity_token: str
    email: EmailStr | None = None
    full_name: AppleFullName | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str
    user: UserPublic
