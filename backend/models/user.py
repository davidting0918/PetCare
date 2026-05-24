"""User model and DTOs.

`User` is the internal/persisted shape (matches the `users` table). `UserPublic`
is what we return to clients — no internal flags, no oauth ids. The user table
has no email/password column post-rewrite: PetCare is OAuth-only (Google + Apple)
and matches the user against `google_id` / `apple_id` instead.

Pets are owned by users but live inside groups for collaborative care. Each
user has a `personal_group_id` that gets auto-created on first login (see
Phase 2 group rewrite — the auth service will populate this once the group
service is ported).
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class AuthSource(str, Enum):
    GOOGLE = "google"
    APPLE = "apple"


# Table name kept as a module constant so service-layer SQL can interpolate
# it without scattering string literals through the codebase.
user_table = "users"


class User(BaseModel):
    """Internal user record (one row in `users`)."""

    id: str  # 8-hex
    email: EmailStr
    name: str
    picture: str | None = None
    google_id: str | None = None
    apple_id: str | None = None
    source: AuthSource
    personal_group_id: str | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class UserPublic(BaseModel):
    """Shape returned to authenticated clients (everything except oauth ids)."""

    id: str
    email: EmailStr
    name: str
    picture: str | None = None
    source: AuthSource
    personal_group_id: str | None = None

    @classmethod
    def from_user(cls, u: User) -> "UserPublic":
        return cls(
            id=u.id,
            email=u.email,
            name=u.name,
            picture=u.picture,
            source=u.source,
            personal_group_id=u.personal_group_id,
        )


# ────── Provider DTOs (returned by GoogleAuthProvider / AppleAuthProvider) ──


class GoogleUserInfo(BaseModel):
    sub: str = Field(..., description="Google user id (the `sub` claim)")
    email: EmailStr
    name: str | None = None
    picture: str | None = None


class AppleUserInfo(BaseModel):
    sub: str = Field(..., description="Apple user id (the `sub` claim)")
    email: EmailStr | None = None
    is_private_email: bool = False
    email_verified: bool = False


# ────── Request DTOs ──────


class UpdateProfileRequest(BaseModel):
    """Patch name / picture. Send `null` to clear, omit the key to leave alone."""

    name: str | None = Field(None, min_length=1, max_length=100)
    picture: str | None = Field(None, max_length=2000)
