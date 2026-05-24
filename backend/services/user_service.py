"""User CRUD + OAuth upsert paths.

OAuth-only world: we never store a password. New users land here via
`upsert_google_user` / `upsert_apple_user`, which match on the provider's `sub`
(falling back to email for the very first link), create a new row if needed,
and otherwise update the picture / linked-provider columns on the existing row.

Personal-group bootstrap is deferred — when the group service is ported to
the new pattern (Phase 2), `_ensure_personal_group` will populate
`users.personal_group_id` on first login.
"""

import logging
import secrets
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status

from backend.core.cloudinary_client import upload_image
from backend.core.postgres_database import PostgresAsyncClient
from backend.models.user import (
    AppleUserInfo,
    AuthSource,
    GoogleUserInfo,
    UpdateProfileRequest,
    User,
    user_table,
)

logger = logging.getLogger(__name__)


class UserService:
    def __init__(self, db: PostgresAsyncClient):
        self._db = db

    # ────── Lookup ──────

    async def get_by_id(self, user_id: str) -> User | None:
        row = await self._db.read_one(
            f"SELECT * FROM {user_table} WHERE id = $1 AND is_active = TRUE",
            user_id,
        )
        return User(**row) if row else None

    async def _get_by_email(self, email: str) -> dict | None:
        return await self._db.read_one(
            f"SELECT * FROM {user_table} WHERE email = $1 AND is_active = TRUE",
            email,
        )

    async def _get_by_google_id(self, google_id: str) -> dict | None:
        return await self._db.read_one(
            f"SELECT * FROM {user_table} WHERE google_id = $1 AND is_active = TRUE",
            google_id,
        )

    async def _get_by_apple_id(self, apple_id: str) -> dict | None:
        return await self._db.read_one(
            f"SELECT * FROM {user_table} WHERE apple_id = $1 AND is_active = TRUE",
            apple_id,
        )

    # ────── ID generation ──────

    async def _generate_unique_id(self) -> str:
        # 8 hex chars matches the `varchar(8)` PK width. Retry on the
        # vanishingly rare collision.
        for _ in range(5):
            candidate = secrets.token_hex(4)
            existing = await self._db.read_one(
                f"SELECT 1 FROM {user_table} WHERE id = $1", candidate
            )
            if existing is None:
                return candidate
        raise RuntimeError("Failed to generate a unique user id after 5 attempts")

    # ────── OAuth upserts ──────

    async def upsert_google_user(self, info: GoogleUserInfo) -> User:
        # 1) Existing google_id wins.
        row = await self._get_by_google_id(info.sub)
        if row:
            await self._refresh_picture_if_changed(row, info.picture)
            return await self._reload(row["id"])

        # 2) Otherwise match by email and link this provider.
        row = await self._get_by_email(info.email)
        if row:
            await self._db.execute(
                f"UPDATE {user_table} SET google_id = $1, picture = COALESCE($2, picture), "
                f"updated_at = $3 WHERE id = $4",
                info.sub, info.picture, datetime.now(timezone.utc), row["id"],
            )
            return await self._reload(row["id"])

        # 3) Fresh signup.
        return await self._create_new_user(
            google_id=info.sub,
            apple_id=None,
            email=info.email,
            name=info.name or info.email.split("@")[0],
            picture=info.picture,
            source=AuthSource.GOOGLE,
        )

    async def upsert_apple_user(
        self, info: AppleUserInfo, *, default_name: str | None
    ) -> User:
        # 1) Existing apple_id wins.
        row = await self._get_by_apple_id(info.sub)
        if row:
            return await self._reload(row["id"])

        # 2) Apple email might be missing (Hide My Email + subsequent logins).
        # Match by email if we have one.
        if info.email:
            row = await self._get_by_email(info.email)
            if row:
                await self._db.execute(
                    f"UPDATE {user_table} SET apple_id = $1, updated_at = $2 WHERE id = $3",
                    info.sub, datetime.now(timezone.utc), row["id"],
                )
                return await self._reload(row["id"])

        # 3) Fresh signup — but Apple may not give us an email after the very
        # first grant, so require it on the first sign-in.
        if not info.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Apple sign-in requires an email on first login; please re-grant the app permission.",
            )

        return await self._create_new_user(
            google_id=None,
            apple_id=info.sub,
            email=info.email,
            name=default_name or info.email.split("@")[0],
            picture=None,
            source=AuthSource.APPLE,
        )

    async def _create_new_user(
        self,
        *,
        google_id: str | None,
        apple_id: str | None,
        email: str,
        name: str,
        picture: str | None,
        source: AuthSource,
    ) -> User:
        user_id = await self._generate_unique_id()
        now = datetime.now(timezone.utc)
        await self._db.insert_one(
            user_table,
            {
                "id": user_id,
                "google_id": google_id,
                "apple_id": apple_id,
                "email": email,
                "name": name,
                "picture": picture,
                "source": source.value,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )
        return await self._reload(user_id)

    async def _reload(self, user_id: str) -> User:
        user = await self.get_by_id(user_id)
        if user is None:
            # Inconsistent state — log and crash; this only happens if a row
            # vanishes between insert and read, which shouldn't be possible
            # in practice.
            raise RuntimeError(f"User {user_id} disappeared after upsert")
        return user

    async def _refresh_picture_if_changed(self, row: dict, picture: str | None) -> None:
        if picture and picture != row.get("picture"):
            await self._db.execute(
                f"UPDATE {user_table} SET picture = $1, updated_at = $2 WHERE id = $3",
                picture, datetime.now(timezone.utc), row["id"],
            )

    # ────── Profile updates ──────

    async def update_profile(self, user_id: str, request: UpdateProfileRequest) -> User:
        # Only include fields the client explicitly sent so omitted keys
        # don't accidentally clear the column.
        fields = request.model_dump(exclude_unset=True)
        if not fields:
            return await self._reload(user_id)

        set_clauses = []
        values: list = []
        for i, (col, val) in enumerate(fields.items(), start=1):
            set_clauses.append(f"{col} = ${i}")
            values.append(val)

        values.append(datetime.now(timezone.utc))
        values.append(user_id)
        ts_placeholder = f"${len(values) - 1}"
        id_placeholder = f"${len(values)}"
        query = (
            f"UPDATE {user_table} SET {', '.join(set_clauses)}, updated_at = {ts_placeholder} "
            f"WHERE id = {id_placeholder} AND is_active = TRUE"
        )
        await self._db.execute(query, *values)
        return await self._reload(user_id)

    # ────── Photo upload (Cloudinary) ──────

    async def upload_user_photo(self, user_id: str, file: UploadFile) -> dict:
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}",
            )

        content = await file.read()
        max_size = 10 * 1024 * 1024  # 10 MB
        actual_size = len(content)
        if actual_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {max_size // (1024 * 1024)} MB",
            )

        upload_result = await upload_image(
            content=content,
            folder="petcare/user_photos",
            public_id=user_id,
            content_type=file.content_type,
        )
        photo_url = upload_result["secure_url"]

        await self._db.execute(
            f"UPDATE {user_table} SET picture = $1, updated_at = $2 WHERE id = $3",
            photo_url, datetime.now(timezone.utc), user_id,
        )

        return {
            "photo_url": photo_url,
            "photo_name": upload_result["public_id"],
            "photo_size": actual_size,
            "photo_type": file.content_type,
            "photo_uploaded_at": int(datetime.now(timezone.utc).timestamp()),
        }
