"""Pet CRUD + group assignment + photo upload.

Permission model:
  - view  (details / accessible / current_group): any member of the pet's group
  - update (any field, including weights/notes/etc.): owner OR group CREATOR / MEMBER
  - delete: owner only
  - assign to a new group: owner AND CREATOR of the target group
  - photo upload: owner only

Heuristic: "owner" is the gold-standard permission everywhere except for the
group-level role you'd expect for viewing, where any active membership in the
pet's group is enough.
"""

import logging
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, UploadFile, status

from backend.core.cloudinary_client import upload_image
from backend.core.postgres_database import PostgresAsyncClient
from backend.models.group import GroupRole, group_member_table, group_table
from backend.models.pet import (
    AssignPetToGroupRequest,
    CreatePetRequest,
    GroupAssignmentInfo,
    PetDetails,
    PetSummary,
    UpdatePetRequest,
    pet_table,
)
from backend.models.user import user_table

logger = logging.getLogger(__name__)


def _compute_age_years(birth_date: datetime | None) -> float | None:
    if birth_date is None:
        return None
    now = datetime.now(timezone.utc)
    return round((now - birth_date).days / 365.25, 2)


class PetService:
    def __init__(self, db: PostgresAsyncClient):
        self._db = db

    # ────── id generation ──────

    async def _generate_pet_id(self) -> str:
        for _ in range(5):
            candidate = secrets.token_hex(4)  # 8 hex
            existing = await self._db.read_one(
                f"SELECT 1 FROM {pet_table} WHERE id = $1", candidate
            )
            if existing is None:
                return candidate
        raise RuntimeError("Failed to generate a unique pet id after 5 attempts")

    # ────── permission helpers ──────

    async def _user_permission_for_pet(
        self, pet_id: str, user_id: str
    ) -> tuple[dict, str]:
        """Returns (pet_row, permission). Permission is one of
        owner / creator / member / viewer. 404s if the pet doesn't exist;
        403s if the user has no membership in the pet's group.
        """
        row = await self._db.read_one(
            f"""
            SELECT
                p.*,
                u.name AS owner_name,
                g.name AS group_name,
                CASE WHEN p.owner_id = $2 THEN 'owner' ELSE gm.role END AS user_permission
            FROM {pet_table} p
            JOIN {user_table} u ON u.id = p.owner_id
            JOIN {group_table} g ON g.id = p.group_id
            LEFT JOIN {group_member_table} gm
              ON gm.group_id = p.group_id
             AND gm.user_id = $2
             AND gm.is_active = TRUE
            WHERE p.id = $1 AND p.is_active = TRUE
            """,
            pet_id, user_id,
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
        if not row.get("user_permission"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this pet",
            )
        return row, row["user_permission"]

    async def _require_can_view(self, pet_id: str, user_id: str) -> dict:
        row, _ = await self._user_permission_for_pet(pet_id, user_id)
        return row

    async def _require_can_modify(self, pet_id: str, user_id: str) -> dict:
        row, permission = await self._user_permission_for_pet(pet_id, user_id)
        if permission not in {"owner", GroupRole.CREATOR.value, GroupRole.MEMBER.value}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Viewers cannot modify pet details",
            )
        return row

    async def _require_is_owner(self, pet_id: str, user_id: str) -> dict:
        row, permission = await self._user_permission_for_pet(pet_id, user_id)
        if permission != "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the pet owner can perform this action",
            )
        return row

    # ────── building blocks ──────

    async def _resolve_default_group_id(
        self, owner_id: str, requested_group_id: str | None
    ) -> str:
        if requested_group_id:
            # Caller must be a CREATOR or MEMBER of the target group (viewers
            # can't add pets; the implicit role rule mirrors `update`).
            membership = await self._db.read_one(
                f"""
                SELECT role FROM {group_member_table}
                WHERE group_id = $1 AND user_id = $2 AND is_active = TRUE
                """,
                requested_group_id, owner_id,
            )
            if membership is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You are not a member of the target group",
                )
            if membership["role"] not in {GroupRole.CREATOR.value, GroupRole.MEMBER.value}:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Viewers cannot create pets in a group",
                )
            return requested_group_id

        user_row = await self._db.read_one(
            f"SELECT personal_group_id FROM {user_table} WHERE id = $1", owner_id
        )
        if user_row is None or not user_row.get("personal_group_id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No personal group on file — re-login to bootstrap one",
            )
        return user_row["personal_group_id"]

    # ────── public API ──────

    async def create_pet(self, request: CreatePetRequest, owner_id: str) -> PetDetails:
        group_id = await self._resolve_default_group_id(owner_id, request.group_id)
        pet_id = await self._generate_pet_id()
        now = datetime.now(timezone.utc)
        await self._db.insert_one(
            pet_table,
            {
                "id": pet_id,
                "name": request.name,
                "pet_type": request.pet_type.value,
                "breed": request.breed,
                "gender": request.gender.value,
                "birth_date": request.birth_date,
                "current_weight_kg": request.current_weight_kg,
                "target_weight_kg": request.target_weight_kg,
                "height_cm": request.height_cm,
                "is_spayed": request.is_spayed,
                "microchip_id": request.microchip_id,
                "daily_calorie_target": request.daily_calorie_target,
                "owner_id": owner_id,
                "group_id": group_id,
                "notes": request.notes,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )
        return await self.get_pet_details(pet_id, owner_id)

    async def get_pet_details(self, pet_id: str, user_id: str) -> PetDetails:
        row = await self._require_can_view(pet_id, user_id)
        return PetDetails(
            id=row["id"],
            name=row["name"],
            pet_type=row["pet_type"],
            breed=row.get("breed"),
            gender=row["gender"],
            birth_date=row.get("birth_date"),
            age=_compute_age_years(row.get("birth_date")),
            current_weight_kg=row.get("current_weight_kg"),
            target_weight_kg=row.get("target_weight_kg"),
            height_cm=row.get("height_cm"),
            is_spayed=bool(row.get("is_spayed", False)),
            microchip_id=row.get("microchip_id"),
            daily_calorie_target=row.get("daily_calorie_target"),
            owner_id=row["owner_id"],
            owner_name=row["owner_name"],
            group_id=row["group_id"],
            group_name=row["group_name"],
            photo_url=row.get("photo_url"),
            notes=row.get("notes"),
            user_permission=row["user_permission"],
            is_active=bool(row["is_active"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def list_accessible_pets(self, user_id: str) -> list[PetSummary]:
        """Every pet whose group the user is an active member of, plus pets
        the user owns (in case ownership outlives the group membership row,
        which shouldn't normally happen but is cheap to handle).
        """
        rows = await self._db.read(
            f"""
            SELECT
                p.id, p.name, p.pet_type, p.breed, p.gender,
                p.current_weight_kg, p.target_weight_kg, p.daily_calorie_target,
                p.photo_url, p.owner_id, p.group_id, p.created_at, p.updated_at,
                u.name AS owner_name,
                g.name AS group_name,
                CASE WHEN p.owner_id = $1 THEN 'owner' ELSE gm.role END AS user_permission
            FROM {pet_table} p
            JOIN {user_table} u ON u.id = p.owner_id
            JOIN {group_table} g ON g.id = p.group_id
            LEFT JOIN {group_member_table} gm
              ON gm.group_id = p.group_id
             AND gm.user_id = $1
             AND gm.is_active = TRUE
            WHERE p.is_active = TRUE
              AND g.is_active = TRUE
              AND (p.owner_id = $1 OR gm.user_id = $1)
            ORDER BY p.created_at DESC
            """,
            user_id,
        )
        return [
            PetSummary(
                id=r["id"],
                name=r["name"],
                pet_type=r["pet_type"],
                breed=r.get("breed"),
                gender=r["gender"],
                current_weight_kg=r.get("current_weight_kg"),
                target_weight_kg=r.get("target_weight_kg"),
                daily_calorie_target=r.get("daily_calorie_target"),
                photo_url=r.get("photo_url"),
                owner_id=r["owner_id"],
                owner_name=r["owner_name"],
                group_id=r["group_id"],
                group_name=r["group_name"],
                user_permission=r["user_permission"] or "owner",
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
            for r in rows
        ]

    async def update_pet(self, request: UpdatePetRequest, user_id: str) -> PetDetails:
        await self._require_can_modify(request.pet_id, user_id)

        # Build a partial UPDATE — only fields the client explicitly sent.
        payload = request.model_dump(exclude_unset=True, exclude={"pet_id"})
        if not payload:
            return await self.get_pet_details(request.pet_id, user_id)

        # Enums come back as enum members; flatten to their string values.
        for k, v in list(payload.items()):
            if hasattr(v, "value"):
                payload[k] = v.value

        set_clauses: list[str] = []
        values: list[Any] = []
        for i, (col, val) in enumerate(payload.items(), start=1):
            set_clauses.append(f"{col} = ${i}")
            values.append(val)

        values.append(datetime.now(timezone.utc))
        values.append(request.pet_id)
        ts_placeholder = f"${len(values) - 1}"
        id_placeholder = f"${len(values)}"

        await self._db.execute(
            f"""
            UPDATE {pet_table}
            SET {', '.join(set_clauses)}, updated_at = {ts_placeholder}
            WHERE id = {id_placeholder} AND is_active = TRUE
            """,
            *values,
        )
        return await self.get_pet_details(request.pet_id, user_id)

    async def delete_pet(self, pet_id: str, user_id: str) -> dict:
        row = await self._require_is_owner(pet_id, user_id)
        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"UPDATE {pet_table} SET is_active = FALSE, updated_at = $1 WHERE id = $2",
            now, pet_id,
        )
        return {
            "deleted_pet_id": pet_id,
            "pet_name": row["name"],
            "deleted_by": user_id,
            "deleted_at": now,
        }

    async def assign_to_group(
        self, request: AssignPetToGroupRequest, user_id: str
    ) -> GroupAssignmentInfo:
        await self._require_is_owner(request.pet_id, user_id)

        # The owner must be the CREATOR of the target group — anything looser
        # would let any group member adopt pets they don't own.
        target = await self._db.read_one(
            f"""
            SELECT gm.role, g.name AS group_name
            FROM {group_member_table} gm
            JOIN {group_table} g ON g.id = gm.group_id AND g.is_active = TRUE
            WHERE gm.group_id = $1 AND gm.user_id = $2 AND gm.is_active = TRUE
            """,
            request.group_id, user_id,
        )
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Target group not found"
            )
        if target["role"] != GroupRole.CREATOR.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be CREATOR of the target group to host a pet there",
            )

        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"UPDATE {pet_table} SET group_id = $1, updated_at = $2 WHERE id = $3",
            request.group_id, now, request.pet_id,
        )

        pet = await self._db.read_one(
            f"SELECT id, name FROM {pet_table} WHERE id = $1", request.pet_id
        )
        return GroupAssignmentInfo(
            pet_id=pet["id"],
            pet_name=pet["name"],
            group_id=request.group_id,
            group_name=target["group_name"],
            user_role_in_group=target["role"],
        )

    async def get_pet_current_group(self, pet_id: str, user_id: str) -> GroupAssignmentInfo:
        row = await self._require_can_view(pet_id, user_id)
        return GroupAssignmentInfo(
            pet_id=row["id"],
            pet_name=row["name"],
            group_id=row["group_id"],
            group_name=row["group_name"],
            user_role_in_group=row["user_permission"]
            if row["user_permission"] != "owner"
            else (await self._lookup_group_role(row["group_id"], user_id)),
        )

    async def _lookup_group_role(self, group_id: str, user_id: str) -> str:
        """Owner is a permission tag, not a group role — when an owner asks for
        their role in the pet's group, return the underlying group_members.role
        (or 'owner' fallback if they somehow lack a membership row).
        """
        membership = await self._db.read_one(
            f"""
            SELECT role FROM {group_member_table}
            WHERE group_id = $1 AND user_id = $2 AND is_active = TRUE
            """,
            group_id, user_id,
        )
        return membership["role"] if membership else "owner"

    # ────── Photo upload ──────

    async def upload_pet_photo(self, pet_id: str, user_id: str, file: UploadFile) -> dict:
        await self._require_is_owner(pet_id, user_id)

        allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"}
        if file.content_type not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(sorted(allowed))}",
            )

        content = await file.read()
        max_size = 10 * 1024 * 1024
        actual_size = len(content)
        if actual_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty"
            )
        if actual_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Max: {max_size // (1024 * 1024)} MB",
            )

        result = await upload_image(
            content=content,
            folder="petcare/pet_photos",
            public_id=pet_id,
            content_type=file.content_type,
        )

        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"UPDATE {pet_table} SET photo_url = $1, updated_at = $2 WHERE id = $3",
            result["secure_url"], now, pet_id,
        )
        return {
            "photo_url": result["secure_url"],
            "photo_name": result["public_id"],
            "photo_size": actual_size,
            "photo_type": file.content_type,
            "photo_uploaded_at": int(now.timestamp()),
        }
