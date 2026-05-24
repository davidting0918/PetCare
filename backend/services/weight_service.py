"""Weight tracking business logic.

Permissions:
  - create: CREATOR or MEMBER of the pet's group (viewers can read but not log)
  - view / list:  any active member of the pet's group
  - update / delete: only the recorder (`weight_records.user_id == actor`)

Soft delete via `is_active`. The recorder restriction is intentional — even
the group's CREATOR doesn't get to overwrite someone else's measurement,
because the audit trail of who logged what matters in shared-care settings.
"""

import logging
import math
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from backend.core.postgres_database import PostgresAsyncClient
from backend.models.group import GroupRole, group_member_table
from backend.models.pet import pet_table
from backend.models.user import user_table
from backend.models.weight import (
    CreateWeightRequest,
    OrderDirection,
    UpdateWeightRequest,
    WeightDetails,
    WeightListResponse,
    WeightOrderBy,
    WeightSummary,
    weight_table,
)

logger = logging.getLogger(__name__)


class WeightService:
    def __init__(self, db: PostgresAsyncClient):
        self._db = db

    # ────── id generation ──────

    async def _generate_weight_id(self) -> str:
        # Schema: varchar(11). 'wt_' + 8 hex = 11.
        for _ in range(5):
            candidate = "wt_" + secrets.token_hex(4)
            existing = await self._db.read_one(
                f"SELECT 1 FROM {weight_table} WHERE id = $1", candidate
            )
            if existing is None:
                return candidate
        raise RuntimeError("Failed to generate a unique weight id after 5 attempts")

    # ────── permission helpers ──────

    async def _get_pet_with_membership(self, pet_id: str, user_id: str) -> dict:
        row = await self._db.read_one(
            f"""
            SELECT
                p.id, p.name, p.pet_type, p.group_id, p.owner_id,
                gm.role AS membership_role
            FROM {pet_table} p
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
        if not row.get("membership_role"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this pet's group",
            )
        return row

    async def _require_can_log_for_pet(self, pet_id: str, user_id: str) -> dict:
        row = await self._get_pet_with_membership(pet_id, user_id)
        if GroupRole(row["membership_role"]) == GroupRole.VIEWER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Viewers cannot log weights",
            )
        return row

    async def _get_weight_or_404(self, weight_id: str) -> dict:
        row = await self._db.read_one(
            f"SELECT * FROM {weight_table} WHERE id = $1 AND is_active = TRUE",
            weight_id,
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Weight record not found"
            )
        return row

    async def _require_recorder(self, weight: dict, user_id: str) -> None:
        if weight["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the user who recorded this weight can modify it",
            )

    # ────── writes ──────

    async def create_weight(self, request: CreateWeightRequest, user_id: str) -> WeightDetails:
        pet = await self._require_can_log_for_pet(request.pet_id, user_id)

        weight_id = await self._generate_weight_id()
        now = datetime.now(timezone.utc)
        timestamp = request.timestamp or now
        await self._db.insert_one(
            weight_table,
            {
                "id": weight_id,
                "pet_id": request.pet_id,
                "user_id": user_id,
                "weight": request.weight,
                "timestamp": timestamp,
                "notes": request.notes,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )

        # Mirror the latest weight onto the pet so dashboards don't need a
        # separate query. The original PetCare schema has `current_weight_kg`
        # as a denormalized column on `pets`.
        await self._db.execute(
            f"UPDATE {pet_table} SET current_weight_kg = $1, updated_at = $2 WHERE id = $3",
            request.weight, now, request.pet_id,
        )

        user_row = await self._db.read_one(
            f"SELECT name FROM {user_table} WHERE id = $1", user_id
        )
        return WeightDetails(
            id=weight_id,
            pet_id=request.pet_id,
            pet_name=pet["name"],
            pet_type=pet["pet_type"],
            weight=request.weight,
            user_id=user_id,
            user_name=user_row["name"] if user_row else "",
            timestamp=timestamp,
            notes=request.notes,
            is_active=True,
            created_at=now,
            updated_at=now,
        )

    async def update_weight(
        self, request: UpdateWeightRequest, user_id: str
    ) -> WeightDetails:
        existing = await self._get_weight_or_404(request.weight_id)
        await self._require_recorder(existing, user_id)

        payload = request.model_dump(exclude_unset=True, exclude={"weight_id"})
        if not payload:
            return await self.get_weight_details(request.weight_id, user_id)

        set_clauses: list[str] = []
        values: list[Any] = []
        for i, (col, val) in enumerate(payload.items(), start=1):
            set_clauses.append(f"{col} = ${i}")
            values.append(val)
        values.append(datetime.now(timezone.utc))
        values.append(request.weight_id)
        ts_placeholder = f"${len(values) - 1}"
        id_placeholder = f"${len(values)}"

        await self._db.execute(
            f"""
            UPDATE {weight_table}
            SET {', '.join(set_clauses)}, updated_at = {ts_placeholder}
            WHERE id = {id_placeholder} AND is_active = TRUE
            """,
            *values,
        )

        # If the weight changed and this row is the most recent for the pet,
        # keep `pets.current_weight_kg` in sync.
        if "weight" in payload:
            latest = await self._db.read_one(
                f"""
                SELECT id FROM {weight_table}
                WHERE pet_id = $1 AND is_active = TRUE
                ORDER BY timestamp DESC, created_at DESC
                LIMIT 1
                """,
                existing["pet_id"],
            )
            if latest and latest["id"] == request.weight_id:
                await self._db.execute(
                    f"UPDATE {pet_table} SET current_weight_kg = $1, updated_at = $2 WHERE id = $3",
                    payload["weight"], datetime.now(timezone.utc), existing["pet_id"],
                )

        return await self.get_weight_details(request.weight_id, user_id)

    async def delete_weight(self, weight_id: str, user_id: str) -> dict:
        existing = await self._get_weight_or_404(weight_id)
        await self._require_recorder(existing, user_id)

        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"UPDATE {weight_table} SET is_active = FALSE, updated_at = $1 WHERE id = $2",
            now, weight_id,
        )
        return {
            "deleted_weight_id": weight_id,
            "pet_id": existing["pet_id"],
            "deleted_by": user_id,
            "deleted_at": now,
        }

    # ────── reads ──────

    async def get_weight_details(self, weight_id: str, user_id: str) -> WeightDetails:
        existing = await self._get_weight_or_404(weight_id)
        await self._get_pet_with_membership(existing["pet_id"], user_id)

        row = await self._db.read_one(
            f"""
            SELECT
                w.*,
                p.name AS pet_name,
                p.pet_type AS pet_type,
                u.name AS user_name
            FROM {weight_table} w
            JOIN {pet_table} p ON p.id = w.pet_id
            LEFT JOIN {user_table} u ON u.id = w.user_id
            WHERE w.id = $1 AND w.is_active = TRUE
            """,
            weight_id,
        )
        assert row is not None
        return WeightDetails(
            id=row["id"],
            pet_id=row["pet_id"],
            pet_name=row["pet_name"],
            pet_type=row["pet_type"],
            weight=row["weight"],
            user_id=row["user_id"],
            user_name=row.get("user_name") or "",
            timestamp=row["timestamp"],
            notes=row.get("notes"),
            is_active=bool(row.get("is_active", True)),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def list_weights(
        self,
        user_id: str,
        pet_id: str | None,
        weight_id: str | None,
        recorder_id: str | None,
        start: datetime | None,
        end: datetime | None,
        order_by: WeightOrderBy,
        order_direction: OrderDirection,
        page: int,
        number: int,
    ) -> WeightListResponse:
        if not pet_id and not weight_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide at least one of pet_id or weight_id",
            )

        if not pet_id and weight_id:
            existing = await self._get_weight_or_404(weight_id)
            pet_id = existing["pet_id"]

        await self._get_pet_with_membership(pet_id, user_id)

        conditions = ["w.is_active = TRUE", "w.pet_id = $1"]
        values: list[Any] = [pet_id]
        if weight_id:
            values.append(weight_id)
            conditions.append(f"w.id = ${len(values)}")
        if recorder_id:
            values.append(recorder_id)
            conditions.append(f"w.user_id = ${len(values)}")
        if start:
            values.append(start)
            conditions.append(f"w.timestamp >= ${len(values)}")
        if end:
            values.append(end)
            conditions.append(f"w.timestamp <= ${len(values)}")

        order_col = {
            WeightOrderBy.TIMESTAMP: "w.timestamp",
            WeightOrderBy.CREATED_AT: "w.created_at",
            WeightOrderBy.UPDATED_AT: "w.updated_at",
        }[order_by]
        order_dir = "ASC" if order_direction == OrderDirection.ASC else "DESC"

        offset = (page - 1) * number
        values_with_pagination = values + [number, offset]
        limit_placeholder = f"${len(values_with_pagination) - 1}"
        offset_placeholder = f"${len(values_with_pagination)}"

        rows = await self._db.read(
            f"""
            SELECT
                w.*,
                u.name AS user_name
            FROM {weight_table} w
            LEFT JOIN {user_table} u ON u.id = w.user_id
            WHERE {' AND '.join(conditions)}
            ORDER BY {order_col} {order_dir}
            LIMIT {limit_placeholder} OFFSET {offset_placeholder}
            """,
            *values_with_pagination,
        )

        total_row = await self._db.read_one(
            f"""
            SELECT COUNT(*)::int AS total
            FROM {weight_table} w
            WHERE {' AND '.join(conditions)}
            """,
            *values,
        )
        total = int(total_row["total"]) if total_row else 0
        total_pages = max(1, math.ceil(total / number)) if total else 0

        records = [
            WeightSummary(
                id=r["id"],
                pet_id=r["pet_id"],
                weight=r["weight"],
                user_id=r["user_id"],
                user_name=r.get("user_name") or "",
                timestamp=r["timestamp"],
                notes=r.get("notes"),
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
            for r in rows
        ]
        return WeightListResponse(
            records=records,
            total=total,
            page=page,
            number=number,
            total_pages=total_pages,
        )
