"""Food catalog business logic.

Permissions:
  - view / list / search: any active member of the group
  - create: CREATOR or MEMBER of the group (viewers can't)
  - update / delete / photo upload: the food's creator, OR the group CREATOR
    (group creator gets veto rights on the catalog regardless of who added
    a given row).

Macro-sum guard: the DB enforces `protein + fat + moisture + carbohydrate <= 105`
but we validate in Python first so the user gets a clean 400 instead of an
opaque Postgres CHECK violation.
"""

import logging
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, UploadFile, status

from backend.core.cloudinary_client import upload_image
from backend.core.postgres_database import PostgresAsyncClient
from backend.models.food import (
    CreateFoodRequest,
    FoodDetails,
    FoodSummary,
    FoodType,
    TargetPet,
    UpdateFoodRequest,
    food_table,
)
from backend.models.group import GroupRole, group_member_table, group_table
from backend.models.user import user_table

logger = logging.getLogger(__name__)

# Match the DB CHECK constraint exactly so we surface a clean error before
# Postgres throws.
MAX_MACRO_SUM = 105.0


class FoodService:
    def __init__(self, db: PostgresAsyncClient):
        self._db = db

    # ────── id generation ──────

    async def _generate_food_id(self) -> str:
        # Schema is varchar(30). 'fd_' prefix + hex tail.
        for _ in range(5):
            candidate = "fd_" + secrets.token_hex(13)  # 'fd_' + 26 hex = 29 chars
            existing = await self._db.read_one(
                f"SELECT 1 FROM {food_table} WHERE id = $1", candidate
            )
            if existing is None:
                return candidate
        raise RuntimeError("Failed to generate a unique food id after 5 attempts")

    # ────── permission helpers ──────

    async def _membership(self, group_id: str, user_id: str) -> dict | None:
        return await self._db.read_one(
            f"""
            SELECT role FROM {group_member_table}
            WHERE group_id = $1 AND user_id = $2 AND is_active = TRUE
            """,
            group_id, user_id,
        )

    async def _require_group_role(
        self, group_id: str, user_id: str, allowed: set[GroupRole]
    ) -> dict:
        membership = await self._membership(group_id, user_id)
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group",
            )
        if GroupRole(membership["role"]) not in allowed:
            roles = ", ".join(sorted(r.value for r in allowed))
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {roles}",
            )
        return membership

    async def _require_can_view(self, group_id: str, user_id: str) -> dict:
        membership = await self._membership(group_id, user_id)
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group",
            )
        return membership

    async def _require_can_modify(self, food: dict, user_id: str) -> None:
        if food.get("creator_id") == user_id:
            return
        membership = await self._membership(food["group_id"], user_id)
        if membership and GroupRole(membership["role"]) == GroupRole.CREATOR:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the food's creator or the group's CREATOR can modify it",
        )

    async def _get_food_or_404(self, food_id: str) -> dict:
        row = await self._db.read_one(
            f"SELECT * FROM {food_table} WHERE id = $1 AND is_active = TRUE",
            food_id,
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food not found")
        return row

    # ────── macro sum guard ──────

    @staticmethod
    def _check_macro_sum(
        protein: float | None,
        fat: float | None,
        moisture: float | None,
        carbohydrate: float | None,
        existing: dict | None = None,
    ) -> None:
        def pick(new, key):
            if new is not None:
                return new
            return float(existing[key]) if existing else 0.0

        total = (
            pick(protein, "protein")
            + pick(fat, "fat")
            + pick(moisture, "moisture")
            + pick(carbohydrate, "carbohydrate")
        )
        if total > MAX_MACRO_SUM:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Nutritional percentages sum to {total:.1f}% (max {MAX_MACRO_SUM:.0f}%)",
            )

    # ────── reads ──────

    async def get_food_details(self, food_id: str, user_id: str) -> FoodDetails:
        food = await self._get_food_or_404(food_id)
        await self._require_can_view(food["group_id"], user_id)

        group_row = await self._db.read_one(
            f"SELECT name FROM {group_table} WHERE id = $1", food["group_id"]
        )
        creator_row = (
            await self._db.read_one(
                f"SELECT name FROM {user_table} WHERE id = $1", food["creator_id"]
            )
            if food.get("creator_id")
            else None
        )

        calories_per_unit = round(food["calories"] * food["unit_weight"] / 100.0, 2)
        return FoodDetails(
            id=food["id"],
            brand=food["brand"],
            product_name=food["product_name"],
            food_type=food["food_type"],
            target_pet=food["target_pet"],
            unit_weight=food["unit_weight"],
            calories=food["calories"],
            protein=food["protein"],
            fat=food["fat"],
            moisture=food["moisture"],
            carbohydrate=food["carbohydrate"],
            calories_per_unit=calories_per_unit,
            photo_url=food.get("photo_url"),
            group_id=food["group_id"],
            group_name=group_row["name"] if group_row else "",
            creator_id=food.get("creator_id"),
            creator_name=creator_row["name"] if creator_row else None,
            is_active=bool(food.get("is_active", True)),
            created_at=food["created_at"],
            updated_at=food["updated_at"],
        )

    async def search_foods(
        self,
        group_id: str,
        user_id: str,
        keyword: str | None,
        food_type: FoodType | None,
        target_pet: TargetPet | None,
    ) -> list[FoodSummary]:
        await self._require_can_view(group_id, user_id)

        conditions = ["group_id = $1", "is_active = TRUE"]
        values: list[Any] = [group_id]
        if food_type is not None:
            values.append(food_type.value)
            conditions.append(f"food_type = ${len(values)}")
        if target_pet is not None:
            values.append(target_pet.value)
            conditions.append(f"target_pet = ${len(values)}")

        keyword_idx: int | None = None
        if keyword:
            values.append(f"%{keyword}%")
            keyword_idx = len(values)
            conditions.append(f"(brand ILIKE ${keyword_idx} OR product_name ILIKE ${keyword_idx})")

        # When keyword is set, prioritize brand matches in sort order so
        # search-as-you-type feels relevant. Otherwise alphabetical.
        if keyword_idx is not None:
            order = (
                f"ORDER BY "
                f"  CASE WHEN brand ILIKE ${keyword_idx} THEN 0 ELSE 1 END, "
                f"  brand ASC, product_name ASC"
            )
        else:
            order = "ORDER BY brand ASC, product_name ASC"

        rows = await self._db.read(
            f"""
            SELECT * FROM {food_table}
            WHERE {' AND '.join(conditions)}
            {order}
            """,
            *values,
        )
        return [
            FoodSummary(
                id=r["id"],
                brand=r["brand"],
                product_name=r["product_name"],
                food_type=r["food_type"],
                target_pet=r["target_pet"],
                unit_weight=r["unit_weight"],
                calories=r["calories"],
                protein=r["protein"],
                fat=r["fat"],
                moisture=r["moisture"],
                carbohydrate=r["carbohydrate"],
                photo_url=r.get("photo_url"),
                group_id=r["group_id"],
                creator_id=r.get("creator_id"),
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
            for r in rows
        ]

    # ────── writes ──────

    async def create_food(self, request: CreateFoodRequest, creator_id: str) -> FoodDetails:
        await self._require_group_role(
            request.group_id, creator_id, {GroupRole.CREATOR, GroupRole.MEMBER}
        )
        self._check_macro_sum(
            request.protein, request.fat, request.moisture, request.carbohydrate
        )

        food_id = await self._generate_food_id()
        now = datetime.now(timezone.utc)
        await self._db.insert_one(
            food_table,
            {
                "id": food_id,
                "group_id": request.group_id,
                "creator_id": creator_id,
                "brand": request.brand,
                "product_name": request.product_name,
                "food_type": request.food_type.value,
                "target_pet": request.target_pet.value,
                "unit_weight": request.unit_weight,
                "calories": request.calories,
                "protein": request.protein,
                "fat": request.fat,
                "moisture": request.moisture,
                "carbohydrate": request.carbohydrate,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )
        return await self.get_food_details(food_id, creator_id)

    async def update_food(self, request: UpdateFoodRequest, user_id: str) -> FoodDetails:
        food = await self._get_food_or_404(request.food_id)
        await self._require_can_modify(food, user_id)

        payload = request.model_dump(exclude_unset=True, exclude={"food_id"})
        if not payload:
            return await self.get_food_details(request.food_id, user_id)

        self._check_macro_sum(
            payload.get("protein"),
            payload.get("fat"),
            payload.get("moisture"),
            payload.get("carbohydrate"),
            existing=food,
        )
        for k, v in list(payload.items()):
            if hasattr(v, "value"):
                payload[k] = v.value

        set_clauses: list[str] = []
        values: list[Any] = []
        for i, (col, val) in enumerate(payload.items(), start=1):
            set_clauses.append(f"{col} = ${i}")
            values.append(val)
        values.append(datetime.now(timezone.utc))
        values.append(request.food_id)
        ts_placeholder = f"${len(values) - 1}"
        id_placeholder = f"${len(values)}"

        await self._db.execute(
            f"""
            UPDATE {food_table}
            SET {', '.join(set_clauses)}, updated_at = {ts_placeholder}
            WHERE id = {id_placeholder} AND is_active = TRUE
            """,
            *values,
        )
        return await self.get_food_details(request.food_id, user_id)

    async def delete_food(self, food_id: str, user_id: str) -> dict:
        food = await self._get_food_or_404(food_id)
        await self._require_can_modify(food, user_id)

        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"UPDATE {food_table} SET is_active = FALSE, updated_at = $1 WHERE id = $2",
            now, food_id,
        )
        return {
            "deleted_food_id": food_id,
            "brand": food["brand"],
            "product_name": food["product_name"],
            "deleted_by": user_id,
            "deleted_at": now,
        }

    # ────── photo upload ──────

    async def upload_food_photo(self, food_id: str, user_id: str, file: UploadFile) -> dict:
        food = await self._get_food_or_404(food_id)
        await self._require_can_modify(food, user_id)

        allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"}
        if file.content_type not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(sorted(allowed))}",
            )

        content = await file.read()
        max_size = 5 * 1024 * 1024  # food photos are smaller than pet photos
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
            folder="petcare/food_photos",
            public_id=food_id,
            content_type=file.content_type,
        )

        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"UPDATE {food_table} SET photo_url = $1, updated_at = $2 WHERE id = $3",
            result["secure_url"], now, food_id,
        )
        return {
            "photo_url": result["secure_url"],
            "photo_name": result["public_id"],
            "photo_size": actual_size,
            "photo_type": file.content_type,
            "photo_uploaded_at": int(now.timestamp()),
        }

