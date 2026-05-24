"""Meal logging business logic.

The hard part is the macro snapshot: every meal row stores absolute gram
values (calories, protein_g, fat_g, …) computed at log time from the food's
per-100g percentages. The translation depends on `serving_type`:

  - GRAMS  →  actual_weight_g = serving_amount
  - UNITS  →  actual_weight_g = serving_amount * food.unit_weight

Then for each macro field on the food: meal.<x>_g = food.<x> * actual_weight_g / 100.

Permissions:
  - create:  CREATOR or MEMBER of the pet's group (viewers can read but not log)
  - view:    any member of the pet's group OR (for group_id-scoped queries)
             any member of that group
  - update / delete: the original recorder, OR the group CREATOR
"""

import logging
import secrets
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status

from backend.core.postgres_database import PostgresAsyncClient
from backend.models.food import food_table
from backend.models.group import GroupRole, group_member_table, group_table
from backend.models.meal import (
    CreateMealRequest,
    MealDetails,
    MealStatistics,
    MealSummary,
    MealType,
    ServingType,
    TodayMealsResponse,
    UpdateMealRequest,
    meal_table,
)
from backend.models.pet import pet_table
from backend.models.user import user_table

logger = logging.getLogger(__name__)


class MealService:
    def __init__(self, db: PostgresAsyncClient):
        self._db = db

    # ────── id generation ──────

    async def _generate_meal_id(self) -> str:
        for _ in range(5):
            candidate = "ml_" + secrets.token_hex(4)  # 'ml_' + 8 hex = 11
            existing = await self._db.read_one(
                f"SELECT 1 FROM {meal_table} WHERE id = $1", candidate
            )
            if existing is None:
                return candidate
        raise RuntimeError("Failed to generate a unique meal id after 5 attempts")

    # ────── permission + lookup helpers ──────

    async def _get_pet(self, pet_id: str) -> dict:
        row = await self._db.read_one(
            f"SELECT id, name, group_id, daily_calorie_target FROM {pet_table} "
            f"WHERE id = $1 AND is_active = TRUE",
            pet_id,
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
        return row

    async def _membership(self, group_id: str, user_id: str) -> dict | None:
        return await self._db.read_one(
            f"""
            SELECT role FROM {group_member_table}
            WHERE group_id = $1 AND user_id = $2 AND is_active = TRUE
            """,
            group_id, user_id,
        )

    async def _require_can_log(self, group_id: str, user_id: str) -> None:
        membership = await self._membership(group_id, user_id)
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this pet's group",
            )
        if GroupRole(membership["role"]) == GroupRole.VIEWER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Viewers cannot log meals",
            )

    async def _require_can_view(self, group_id: str, user_id: str) -> None:
        membership = await self._membership(group_id, user_id)
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group",
            )

    async def _get_meal_or_404(self, meal_id: str) -> dict:
        row = await self._db.read_one(
            f"SELECT * FROM {meal_table} WHERE id = $1 AND is_active = TRUE",
            meal_id,
        )
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")
        return row

    async def _require_can_modify(self, meal: dict, user_id: str) -> None:
        if meal["user_id"] == user_id:
            return
        membership = await self._membership(meal["group_id"], user_id)
        if membership and GroupRole(membership["role"]) == GroupRole.CREATOR:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the recorder or the group's CREATOR can modify this meal",
        )

    async def _get_food_in_group(self, food_id: str, group_id: str) -> dict:
        food = await self._db.read_one(
            f"SELECT * FROM {food_table} WHERE id = $1 AND is_active = TRUE",
            food_id,
        )
        if food is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food not found")
        if food["group_id"] != group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Food belongs to a different group than this pet",
            )
        return food

    # ────── macro snapshot ──────

    @staticmethod
    def _snapshot_macros(
        food: dict, serving_type: ServingType, serving_amount: float
    ) -> dict[str, float]:
        if serving_type == ServingType.GRAMS:
            actual_weight_g = float(serving_amount)
        else:  # UNITS
            actual_weight_g = float(serving_amount) * float(food["unit_weight"])

        ratio = actual_weight_g / 100.0
        return {
            "actual_weight_g": round(actual_weight_g, 2),
            "calories": round(float(food["calories"]) * ratio, 2),
            "protein_g": round(float(food["protein"]) * ratio, 2),
            "fat_g": round(float(food["fat"]) * ratio, 2),
            "moisture_g": round(float(food["moisture"]) * ratio, 2),
            "carbohydrate_g": round(float(food["carbohydrate"]) * ratio, 2),
        }

    # ────── writes ──────

    async def create_meal(self, request: CreateMealRequest, user_id: str) -> MealDetails:
        pet = await self._get_pet(request.pet_id)
        await self._require_can_log(pet["group_id"], user_id)
        food = await self._get_food_in_group(request.food_id, pet["group_id"])

        snapshot = self._snapshot_macros(food, request.serving_type, request.serving_amount)
        meal_id = await self._generate_meal_id()
        now = datetime.now(timezone.utc)
        timestamp = request.timestamp or now

        await self._db.insert_one(
            meal_table,
            {
                "id": meal_id,
                "pet_id": request.pet_id,
                "food_id": request.food_id,
                "user_id": user_id,
                "group_id": pet["group_id"],
                "timestamp": timestamp,
                "meal_type": request.meal_type.value if request.meal_type else None,
                "serving_type": request.serving_type.value,
                "serving_amount": request.serving_amount,
                "actual_weight_g": snapshot["actual_weight_g"],
                "calories": snapshot["calories"],
                "protein_g": snapshot["protein_g"],
                "fat_g": snapshot["fat_g"],
                "moisture_g": snapshot["moisture_g"],
                "carbohydrate_g": snapshot["carbohydrate_g"],
                "notes": request.notes,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        )
        return await self.get_meal_details(meal_id, user_id)

    async def update_meal(self, request: UpdateMealRequest, user_id: str) -> MealDetails:
        meal = await self._get_meal_or_404(request.meal_id)
        await self._require_can_modify(meal, user_id)

        # Determine new food/serving — fall back to existing values when the
        # client didn't send a change. If anything affecting the macro snapshot
        # changed, recompute and overwrite the stored gram values.
        new_food_id = request.food_id or meal["food_id"]
        new_serving_type = (
            ServingType(request.serving_type.value)
            if request.serving_type
            else ServingType(meal["serving_type"])
        )
        new_serving_amount = (
            float(request.serving_amount)
            if request.serving_amount is not None
            else float(meal["serving_amount"])
        )

        snapshot: dict[str, float] | None = None
        macro_changed = (
            request.food_id is not None
            or request.serving_type is not None
            or request.serving_amount is not None
        )
        if macro_changed:
            food = await self._get_food_in_group(new_food_id, meal["group_id"])
            snapshot = self._snapshot_macros(food, new_serving_type, new_serving_amount)

        payload: dict[str, Any] = {}
        if request.food_id is not None:
            payload["food_id"] = new_food_id
        if request.timestamp is not None:
            payload["timestamp"] = request.timestamp
        if request.meal_type is not None:
            payload["meal_type"] = request.meal_type.value
        if request.serving_type is not None:
            payload["serving_type"] = new_serving_type.value
        if request.serving_amount is not None:
            payload["serving_amount"] = new_serving_amount
        if request.notes is not None:
            payload["notes"] = request.notes
        if snapshot is not None:
            payload.update(snapshot)

        if not payload:
            return await self.get_meal_details(request.meal_id, user_id)

        set_clauses: list[str] = []
        values: list[Any] = []
        for i, (col, val) in enumerate(payload.items(), start=1):
            set_clauses.append(f"{col} = ${i}")
            values.append(val)
        values.append(datetime.now(timezone.utc))
        values.append(request.meal_id)
        ts_placeholder = f"${len(values) - 1}"
        id_placeholder = f"${len(values)}"

        await self._db.execute(
            f"""
            UPDATE {meal_table}
            SET {', '.join(set_clauses)}, updated_at = {ts_placeholder}
            WHERE id = {id_placeholder} AND is_active = TRUE
            """,
            *values,
        )
        return await self.get_meal_details(request.meal_id, user_id)

    async def delete_meal(self, meal_id: str, user_id: str) -> dict:
        meal = await self._get_meal_or_404(meal_id)
        await self._require_can_modify(meal, user_id)

        now = datetime.now(timezone.utc)
        await self._db.execute(
            f"UPDATE {meal_table} SET is_active = FALSE, updated_at = $1 WHERE id = $2",
            now, meal_id,
        )
        return {
            "deleted_meal_id": meal_id,
            "pet_id": meal["pet_id"],
            "deleted_by": user_id,
            "deleted_at": now,
        }

    # ────── reads ──────

    async def get_meal_details(self, meal_id: str, user_id: str) -> MealDetails:
        meal = await self._get_meal_or_404(meal_id)
        await self._require_can_view(meal["group_id"], user_id)

        row = await self._db.read_one(
            f"""
            SELECT
                m.*,
                p.name AS pet_name,
                f.brand AS food_brand,
                f.product_name AS food_product_name,
                u.name AS fed_by_name,
                g.name AS group_name
            FROM {meal_table} m
            JOIN {pet_table} p ON p.id = m.pet_id
            JOIN {food_table} f ON f.id = m.food_id
            LEFT JOIN {user_table} u ON u.id = m.user_id
            JOIN {group_table} g ON g.id = m.group_id
            WHERE m.id = $1
            """,
            meal_id,
        )
        assert row is not None
        return MealDetails(
            id=row["id"],
            pet_id=row["pet_id"],
            pet_name=row["pet_name"],
            food_id=row["food_id"],
            food_brand=row["food_brand"],
            food_product_name=row["food_product_name"],
            user_id=row["user_id"],
            fed_by_name=row.get("fed_by_name") or "",
            group_id=row["group_id"],
            group_name=row["group_name"],
            timestamp=row["timestamp"],
            meal_type=row.get("meal_type"),
            serving_type=row["serving_type"],
            serving_amount=row["serving_amount"],
            actual_weight_g=row["actual_weight_g"],
            calories=row["calories"],
            protein_g=row["protein_g"],
            fat_g=row["fat_g"],
            moisture_g=row["moisture_g"],
            carbohydrate_g=row["carbohydrate_g"],
            notes=row.get("notes"),
            is_active=bool(row.get("is_active", True)),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def list_meals(
        self,
        user_id: str,
        pet_id: str | None,
        group_id: str | None,
        fed_by: str | None,
        date_from: str | None,
        date_to: str | None,
        meal_type: MealType | None,
        limit: int,
        offset: int,
    ) -> list[MealSummary]:
        if not pet_id and not group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide pet_id or group_id",
            )

        # Resolve and authorize the group scope.
        if not group_id:
            pet = await self._get_pet(pet_id)
            group_id = pet["group_id"]
        await self._require_can_view(group_id, user_id)

        conditions = ["m.is_active = TRUE", "m.group_id = $1"]
        values: list[Any] = [group_id]
        if pet_id:
            values.append(pet_id)
            conditions.append(f"m.pet_id = ${len(values)}")
        if fed_by:
            values.append(fed_by)
            conditions.append(f"m.user_id = ${len(values)}")
        if date_from:
            values.append(_parse_date_start(date_from))
            conditions.append(f"m.timestamp >= ${len(values)}")
        if date_to:
            values.append(_parse_date_end(date_to))
            conditions.append(f"m.timestamp <= ${len(values)}")
        if meal_type:
            values.append(meal_type.value)
            conditions.append(f"m.meal_type = ${len(values)}")

        values_with_pagination = values + [limit, offset]
        limit_placeholder = f"${len(values_with_pagination) - 1}"
        offset_placeholder = f"${len(values_with_pagination)}"

        rows = await self._db.read(
            f"""
            SELECT
                m.*,
                p.name AS pet_name,
                f.brand AS food_brand,
                f.product_name AS food_product_name,
                u.name AS fed_by_name
            FROM {meal_table} m
            JOIN {pet_table} p ON p.id = m.pet_id
            JOIN {food_table} f ON f.id = m.food_id
            LEFT JOIN {user_table} u ON u.id = m.user_id
            WHERE {' AND '.join(conditions)}
            ORDER BY m.timestamp DESC, m.created_at DESC
            LIMIT {limit_placeholder} OFFSET {offset_placeholder}
            """,
            *values_with_pagination,
        )
        return [self._row_to_summary(r) for r in rows]

    @staticmethod
    def _row_to_summary(r: dict) -> MealSummary:
        return MealSummary(
            id=r["id"],
            pet_id=r["pet_id"],
            pet_name=r["pet_name"],
            food_id=r["food_id"],
            food_brand=r["food_brand"],
            food_product_name=r["food_product_name"],
            user_id=r["user_id"],
            fed_by_name=r.get("fed_by_name") or "",
            group_id=r["group_id"],
            timestamp=r["timestamp"],
            meal_type=r.get("meal_type"),
            serving_type=r["serving_type"],
            serving_amount=r["serving_amount"],
            actual_weight_g=r["actual_weight_g"],
            calories=r["calories"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )

    # ────── today ──────

    async def get_today_meals(
        self,
        user_id: str,
        pet_id: str | None,
        group_id: str | None,
        fed_by: str | None,
        meal_type: MealType | None,
        local_date: str | None,
    ) -> TodayMealsResponse:
        if not pet_id and not group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide pet_id or group_id",
            )

        # Default "today" to the server's UTC day if the client didn't tell us
        # its calendar day. iOS should always send local_date so we don't roll
        # over too early/late for users in other timezones.
        if local_date:
            try:
                d = date.fromisoformat(local_date)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="local_date must be in YYYY-MM-DD format",
                )
        else:
            d = datetime.now(timezone.utc).date()
        day_start = datetime.combine(d, time.min, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        # Pull the day's meals via the existing list helper but with a tight
        # date range, then filter in Python for the exact half-open interval.
        meals = await self.list_meals(
            user_id=user_id,
            pet_id=pet_id,
            group_id=group_id,
            fed_by=fed_by,
            date_from=d.isoformat(),
            date_to=d.isoformat(),
            meal_type=meal_type,
            limit=1000,
            offset=0,
        )
        meals = [m for m in meals if day_start <= m.timestamp < day_end]

        total_meals = len(meals)
        total_calories = sum(m.calories for m in meals)
        total_weight_g = sum(m.actual_weight_g for m in meals)
        counts = {t.value: 0 for t in MealType}
        for m in meals:
            if m.meal_type:
                counts[m.meal_type.value] = counts.get(m.meal_type.value, 0) + 1

        pet_name: str | None = None
        daily_calorie_target: int | None = None
        target_pct: float | None = None
        pets_fed: int | None = None
        if pet_id:
            pet = await self._get_pet(pet_id)
            pet_name = pet["name"]
            daily_calorie_target = pet.get("daily_calorie_target")
            if daily_calorie_target:
                target_pct = round(total_calories / float(daily_calorie_target) * 100.0, 2)
        if group_id and not pet_id:
            pets_fed = len({m.pet_id for m in meals})

        return TodayMealsResponse(
            date=d.isoformat(),
            total_meals=total_meals,
            total_calories=round(total_calories, 2),
            total_weight_g=round(total_weight_g, 2),
            breakfast_count=counts[MealType.BREAKFAST.value],
            lunch_count=counts[MealType.LUNCH.value],
            dinner_count=counts[MealType.DINNER.value],
            snack_count=counts[MealType.SNACK.value],
            pet_id=pet_id,
            pet_name=pet_name,
            daily_calorie_target=daily_calorie_target,
            calorie_target_percentage=target_pct,
            group_id=group_id,
            pets_fed_count=pets_fed,
            meals=meals,
        )

    # ────── summary (statistics over date range) ──────

    async def get_statistics(
        self,
        user_id: str,
        pet_id: str | None,
        group_id: str | None,
        date_from: str,
        date_to: str,
        fed_by: str | None,
        meal_type: MealType | None,
    ) -> MealStatistics:
        if not pet_id and not group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide pet_id or group_id",
            )

        try:
            d_from = date.fromisoformat(date_from)
            d_to = date.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="date_from / date_to must be in YYYY-MM-DD format",
            )
        if d_from > d_to:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="date_from must be <= date_to",
            )
        total_days = (d_to - d_from).days + 1

        if not group_id:
            pet = await self._get_pet(pet_id)
            group_id = pet["group_id"]
        await self._require_can_view(group_id, user_id)

        conditions = ["m.is_active = TRUE", "m.group_id = $1"]
        values: list[Any] = [group_id]
        if pet_id:
            values.append(pet_id)
            conditions.append(f"m.pet_id = ${len(values)}")
        if fed_by:
            values.append(fed_by)
            conditions.append(f"m.user_id = ${len(values)}")
        if meal_type:
            values.append(meal_type.value)
            conditions.append(f"m.meal_type = ${len(values)}")
        values.append(_parse_date_start(date_from))
        conditions.append(f"m.timestamp >= ${len(values)}")
        values.append(_parse_date_end(date_to))
        conditions.append(f"m.timestamp <= ${len(values)}")

        agg = (
            await self._db.read_one(
                f"""
                SELECT
                    COUNT(*)::int AS total_meals,
                    COALESCE(SUM(m.calories), 0)::float AS total_calories,
                    COALESCE(SUM(m.actual_weight_g), 0)::float AS total_weight_g,
                    COALESCE(SUM(m.protein_g), 0)::float AS total_protein_g,
                    COALESCE(SUM(m.fat_g), 0)::float AS total_fat_g,
                    COALESCE(SUM(m.moisture_g), 0)::float AS total_moisture_g,
                    COALESCE(SUM(m.carbohydrate_g), 0)::float AS total_carbohydrate_g
                FROM {meal_table} m
                WHERE {' AND '.join(conditions)}
                """,
                *values,
            )
            or {}
        )

        type_rows = await self._db.read(
            f"""
            SELECT m.meal_type, COUNT(*)::int AS count
            FROM {meal_table} m
            WHERE {' AND '.join(conditions)}
            GROUP BY m.meal_type
            """,
            *values,
        )
        meal_type_counts = {t.value: 0 for t in MealType}
        for r in type_rows:
            if r["meal_type"]:
                meal_type_counts[r["meal_type"]] = int(r["count"])

        def avg(total: float) -> float:
            return round(total / total_days, 2) if total_days > 0 else 0.0

        return MealStatistics(
            date_from=date_from,
            date_to=date_to,
            total_days=total_days,
            total_meals=int(agg.get("total_meals", 0)),
            total_calories=round(float(agg.get("total_calories", 0.0)), 2),
            total_weight_g=round(float(agg.get("total_weight_g", 0.0)), 2),
            average_meals_per_day=avg(float(agg.get("total_meals", 0))),
            average_calories_per_day=avg(float(agg.get("total_calories", 0.0))),
            average_protein_g_per_day=avg(float(agg.get("total_protein_g", 0.0))),
            average_fat_g_per_day=avg(float(agg.get("total_fat_g", 0.0))),
            average_moisture_g_per_day=avg(float(agg.get("total_moisture_g", 0.0))),
            average_carbohydrate_g_per_day=avg(float(agg.get("total_carbohydrate_g", 0.0))),
            meal_type_counts=meal_type_counts,
        )


def _parse_date_start(date_str: str) -> datetime:
    try:
        d = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date '{date_str}' — use YYYY-MM-DD",
        )
    return datetime.combine(d, time.min, tzinfo=timezone.utc)


def _parse_date_end(date_str: str) -> datetime:
    try:
        d = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date '{date_str}' — use YYYY-MM-DD",
        )
    return datetime.combine(d, time.max, tzinfo=timezone.utc)
