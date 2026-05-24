"""JWT issue/verify + refresh-token rotation, on top of PostgreSQL.

Token lifecycle:
  - access_token  : signed JWT, short-lived (default 120m). Sent in
                    `Authorization: Bearer <jwt>`. Verified by decoding +
                    checking we still have an `is_active = TRUE` row in
                    `access_tokens` for this user.
  - refresh_token : opaque random string, longer-lived (default 30d).
                    Stored in `refresh_tokens`. Single-use: refreshing
                    deactivates the old row and issues a fresh pair.

Logout = deactivate all refresh tokens AND all active access tokens (so the
client is fully cut off, not just on next JWT expiry).
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from backend.core.config import settings
from backend.core.db_manager import get_db
from backend.core.postgres_database import PostgresAsyncClient
from backend.models.auth import (
    AppleFullName,
    LoginResponse,
    TokenPair,
    access_token_table,
    refresh_token_table,
)
from backend.models.user import User, UserPublic, user_table
from backend.services.apple_auth_provider import AppleAuthProvider
from backend.services.google_auth_provider import GoogleAuthProvider
from backend.services.group_service import GroupService
from backend.services.user_service import UserService

logger = logging.getLogger(__name__)

# `tokenUrl` is unused (we don't run a password-grant flow) but FastAPI's
# dependency needs it. The actual mechanism is plain Bearer-header parsing.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)


class AuthService:
    def __init__(
        self,
        db: PostgresAsyncClient,
        users: UserService,
        groups: GroupService,
        google: GoogleAuthProvider,
        apple: AppleAuthProvider,
    ):
        self._db = db
        self._users = users
        self._groups = groups
        self._google = google
        self._apple = apple

    # ────── Login flows ──────

    async def login_with_google(self, id_token: str) -> LoginResponse:
        info = await self._google.verify_token(id_token)
        user = await self._users.upsert_google_user(info)
        return await self._issue_login(user)

    async def login_with_apple(
        self,
        identity_token: str,
        email: str | None,
        full_name: AppleFullName | None,
    ) -> LoginResponse:
        info = await self._apple.verify_token(identity_token, fallback_email=email)
        default_name = full_name.joined() if full_name else None
        user = await self._users.upsert_apple_user(info, default_name=default_name)
        return await self._issue_login(user)

    async def _issue_login(self, user: User) -> LoginResponse:
        # Guarantee a personal group exists for this user — every PetCare
        # account needs at least one group to host its pets, so we bootstrap
        # one named after the user on first login. Idempotent: cheap SELECT
        # every time, INSERT only once ever.
        user = await self._ensure_personal_group(user)
        pair = await self.issue_token_pair(user.id)
        return LoginResponse(
            access_token=pair.access_token,
            token_type=pair.token_type,
            refresh_token=pair.refresh_token,
            user=UserPublic.from_user(user),
        )

    async def _ensure_personal_group(self, user: User) -> User:
        if user.personal_group_id:
            return user
        group_id = await self._groups.create_personal_group(
            owner_id=user.id, owner_name=user.name
        )
        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"UPDATE {user_table} SET personal_group_id = $1, updated_at = $2 WHERE id = $3",
            group_id, now, user.id,
        )
        # Reload so the LoginResponse carries the populated personal_group_id.
        refreshed = await self._users.get_by_id(user.id)
        return refreshed or user

    # ────── Token issuance ──────

    async def issue_token_pair(self, user_id: str) -> TokenPair:
        now = datetime.now(timezone.utc)
        access_jwt, access_expires = self._encode_access_jwt(user_id, now)

        # Insert access token and grab its serial PK for the refresh-token FK.
        access_row = await self._db.execute_returning(
            f"""
            INSERT INTO {access_token_table} (token, user_id, expires_at, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, TRUE, $4, $4)
            RETURNING id
            """,
            access_jwt, user_id, access_expires, now,
        )
        if access_row is None:
            raise RuntimeError("Failed to insert access_token row")

        refresh = secrets.token_urlsafe(48)
        refresh_expires = now + timedelta(days=settings.refresh_token_expire_days)
        await self._db.execute(
            f"""
            INSERT INTO {refresh_token_table}
              (token, user_id, access_token_id, expires_at, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, TRUE, $5, $5)
            """,
            refresh, user_id, access_row["id"], refresh_expires, now,
        )

        return TokenPair(access_token=access_jwt, refresh_token=refresh)

    def _encode_access_jwt(self, user_id: str, now: datetime) -> tuple[str, datetime]:
        expire = now + timedelta(minutes=settings.access_token_expire_minutes)
        payload = {"sub": user_id, "exp": int(expire.timestamp()), "iat": int(now.timestamp())}
        token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        return token, expire

    # ────── Refresh ──────

    async def refresh_tokens(self, refresh_token: str) -> TokenPair:
        now = datetime.now(timezone.utc)

        # Atomically claim the refresh token: deactivate it iff it's still
        # active and not expired. RETURNING tells us whether we got it.
        row = await self._db.execute_returning(
            f"""
            UPDATE {refresh_token_table}
            SET is_active = FALSE, updated_at = $1
            WHERE token = $2 AND is_active = TRUE AND expires_at > $1
            RETURNING user_id
            """,
            now, refresh_token,
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )
        return await self.issue_token_pair(row["user_id"])

    # ────── Logout / revocation ──────

    async def revoke_all_for_user(self, user_id: str) -> None:
        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"UPDATE {refresh_token_table} SET is_active = FALSE, updated_at = $1 "
            f"WHERE user_id = $2 AND is_active = TRUE",
            now, user_id,
        )
        await self._db.execute(
            f"UPDATE {access_token_table} SET is_active = FALSE, updated_at = $1 "
            f"WHERE user_id = $2 AND is_active = TRUE",
            now, user_id,
        )

    # ────── Bearer-token verification (used by `get_current_user` dep) ──────

    async def resolve_access_token(self, token: str) -> User:
        try:
            payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        except JWTError as e:
            logger.debug("JWT decode failed: %s", e)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject"
            )

        # Confirm the token row is still active. This is what lets logout
        # cut access immediately rather than wait for JWT expiry.
        active = await self._db.read_one(
            f"""
            SELECT 1 FROM {access_token_table}
            WHERE token = $1 AND user_id = $2 AND is_active = TRUE
            """,
            token, user_id,
        )
        if active is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked"
            )

        user = await self._users.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists"
            )
        return user


# ────── FastAPI dependency wiring ──────


def _build_service() -> AuthService:
    db = get_db()
    return AuthService(
        db=db,
        users=UserService(db),
        groups=GroupService(db),
        google=GoogleAuthProvider(),
        apple=AppleAuthProvider(),
    )


def get_auth_service() -> AuthService:
    return _build_service()


def get_user_service() -> UserService:
    return UserService(get_db())


async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await service.resolve_access_token(token)
