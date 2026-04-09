"""
Unit tests for ``backend.services.meal_service.MealService``.

These tests follow the unit-tier rules:

* No FastAPI app import — only ``MealService`` is imported.
* No real Postgres — ``get_db`` is patched to return an ``AsyncMock``.
* Each test gets its own fresh mocks via fixtures (parallel-safe).

Authorization coverage focuses on the role gates that govern recording
(creator/member only) and viewing (creator/member/viewer); plus the
``_can_modify_meal`` rule that members may only modify their own
records while creators may modify any record.
"""

from datetime import datetime as dt
from datetime import timezone as tz
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from backend.models.meal import CreateMealRequest, MealQueryFilters, MealType, ServingType, UpdateMealRequest
from backend.models.user import UserInfo

# ================================================================
# Helpers
# ================================================================


def _make_pet_context(**overrides):
    base = {
        "pet_id": "p_test01",
        "pet_name": "Fluffy",
        "owner_id": "u_owner",
        "group_id": "grp_test01",
        "group_name": "Test Group",
    }
    base.update(overrides)
    return base


def _make_food_data(**overrides):
    base = {
        "id": "f_test01",
        "brand": "Acme",
        "product_name": "Premium Cat",
        "food_type": "dry_food",
        "target_pet": "cat",
        "unit_weight": 100.0,
        "calories": 350.0,
        "protein": 30.0,
        "fat": 15.0,
        "moisture": 10.0,
        "carbohydrate": 40.0,
    }
    base.update(overrides)
    return base


def _make_meal_row(**overrides):
    base = {
        "id": "ml_test01",
        "pet_id": "p_test01",
        "food_id": "f_test01",
        "user_id": "u_test01",
        "group_id": "grp_test01",
        "timestamp": dt(2026, 4, 8, 12, tzinfo=tz.utc),
        "meal_type": "lunch",
        "serving_type": "grams",
        "serving_amount": 200.0,
        "actual_weight_g": 200.0,
        "calories": 700.0,
        "protein_g": 60.0,
        "fat_g": 30.0,
        "moisture_g": 20.0,
        "carbohydrate_g": 80.0,
        "created_at": dt(2026, 4, 8, 12, tzinfo=tz.utc),
        "updated_at": dt(2026, 4, 8, 12, tzinfo=tz.utc),
        "is_active": True,
        "notes": None,
        "pet_name": "Fluffy",
        "food_name": "Acme - Premium Cat",
        "food_brand": "Acme",
        "food_product_name": "Premium Cat",
        "fed_by_name": "Test User",
        "group_name": "Test Group",
    }
    base.update(overrides)
    return base


def _make_user_info(user_id="u_test01"):
    return UserInfo(
        id=user_id,
        email="test@example.com",
        name="Test User",
        personal_group_id="grp_personal",
        created_at=dt(2026, 4, 8, tzinfo=tz.utc),
        updated_at=dt(2026, 4, 8, tzinfo=tz.utc),
        source="test_client",
        is_active=True,
        is_verified=True,
    )


# ================================================================
# Fixtures
# ================================================================


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.read = AsyncMock()
    db.read_one = AsyncMock()
    db.insert = AsyncMock()
    db.insert_one = AsyncMock()
    db.execute = AsyncMock()
    db.execute_returning = AsyncMock()
    return db


@pytest.fixture
def meal_service(monkeypatch, mock_db):
    monkeypatch.setattr("backend.services.meal_service.get_db", lambda: mock_db)
    from backend.services.meal_service import MealService

    return MealService()


# ================================================================
# Pure-function helpers
# ================================================================


class TestCalculateActualWeight:
    def test_grams_input_passes_through(self, meal_service):
        result = meal_service._calculate_actual_weight(ServingType.GRAMS, 150.0, 100.0)
        assert result == 150.0

    def test_units_input_multiplied_by_food_unit_weight(self, meal_service):
        # 2 units × 85g per unit → 170g
        result = meal_service._calculate_actual_weight(ServingType.UNITS, 2.0, 85.0)
        assert result == 170.0


class TestCalculateNutritionValues:
    def test_scales_per_100g_values_to_actual_weight(self, meal_service):
        # 200g consumed of food with 350cal/100g → 700cal total
        food = _make_food_data()
        result = meal_service._calculate_nutrition_values(200.0, food)
        assert result["calories"] == 700.0
        assert result["protein_g"] == 60.0
        assert result["fat_g"] == 30.0
        assert result["moisture_g"] == 20.0
        assert result["carbohydrate_g"] == 80.0

    def test_zero_weight_yields_zero_nutrition(self, meal_service):
        food = _make_food_data()
        result = meal_service._calculate_nutrition_values(0.0, food)
        assert all(v == 0.0 for v in result.values())


# ================================================================
# create_meal
# ================================================================


class TestCreateMeal:
    @pytest.mark.asyncio
    async def test_member_can_record_meal(self, meal_service, mock_db):
        # Arrange
        mock_db.read_one.side_effect = [
            _make_pet_context(),  # _get_pet_group_context
            {"role": "member"},  # _can_record_meal
            _make_food_data(),  # _validate_food_access
            _make_meal_row(),  # get_meal_details query
            {"role": "member"},  # get_meal_details permission check
        ]

        request = CreateMealRequest(
            pet_id="p_test01",
            food_id="f_test01",
            serving_type=ServingType.GRAMS,
            serving_amount=200.0,
            meal_type=MealType.LUNCH,
        )

        # Act
        result = await meal_service.create_meal(request, _make_user_info("u_member"))

        # Assert: meal was inserted via execute_returning
        assert mock_db.execute_returning.await_count == 1
        sql = mock_db.execute_returning.await_args.args[0]
        assert "INSERT INTO meals" in sql
        # Assert: calculated nutrition surfaced through get_meal_details
        assert result.calories == 700.0

    @pytest.mark.asyncio
    async def test_viewer_cannot_record_meal(self, meal_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_pet_context(),
            {"role": "viewer"},
        ]

        request = CreateMealRequest(
            pet_id="p_test01", food_id="f_test01", serving_type=ServingType.GRAMS, serving_amount=200.0
        )

        with pytest.raises(HTTPException) as exc:
            await meal_service.create_meal(request, _make_user_info("u_viewer"))
        assert exc.value.status_code == 403
        assert mock_db.execute_returning.await_count == 0

    @pytest.mark.asyncio
    async def test_food_not_in_group_returns_404(self, meal_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_pet_context(),
            {"role": "creator"},
            None,  # _validate_food_access → no food
        ]

        request = CreateMealRequest(
            pet_id="p_test01", food_id="f_ghost", serving_type=ServingType.GRAMS, serving_amount=200.0
        )

        with pytest.raises(HTTPException) as exc:
            await meal_service.create_meal(request, _make_user_info())
        assert exc.value.status_code == 404


# ================================================================
# get_meals
# ================================================================


class TestGetMeals:
    @pytest.mark.asyncio
    async def test_requires_pet_id_or_group_id(self, meal_service):
        filters = MealQueryFilters()  # neither set

        with pytest.raises(HTTPException) as exc:
            await meal_service.get_meals(filters, "u_test01")
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_pet_scope_rejects_non_member(self, meal_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_pet_context(),
            {"role": "none"},  # _get_user_group_role returns "none" if no row, but here we return explicitly
        ]
        # Easier: have _get_user_group_role return None to drive the "none" path
        mock_db.read_one.side_effect = [_make_pet_context(), None]

        with pytest.raises(HTTPException) as exc:
            await meal_service.get_meals(MealQueryFilters(pet_id="p_test01"), "u_outsider")
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_group_scope_returns_meal_info_list(self, meal_service, mock_db):
        mock_db.read_one.return_value = {"role": "viewer"}
        mock_db.read.return_value = [_make_meal_row(), _make_meal_row(id="ml_test02")]

        result = await meal_service.get_meals(MealQueryFilters(group_id="grp_test01"), "u_viewer")

        assert len(result) == 2
        assert result[0].id == "ml_test01"


# ================================================================
# get_meal_details
# ================================================================


class TestGetMealDetails:
    @pytest.mark.asyncio
    async def test_member_can_view_meal(self, meal_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_meal_row(),
            {"role": "member"},
        ]

        result = await meal_service.get_meal_details("ml_test01", "u_test01")

        assert result.id == "ml_test01"
        assert result.calories == 700.0

    @pytest.mark.asyncio
    async def test_meal_not_found_returns_404(self, meal_service, mock_db):
        mock_db.read_one.return_value = None

        with pytest.raises(HTTPException) as exc:
            await meal_service.get_meal_details("ml_ghost", "u_test01")
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_non_member_cannot_view_meal(self, meal_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_meal_row(),
            None,  # _get_user_group_role → no role → "none"
        ]

        with pytest.raises(HTTPException) as exc:
            await meal_service.get_meal_details("ml_test01", "u_outsider")
        assert exc.value.status_code == 403


# ================================================================
# delete_meal
# ================================================================


class TestDeleteMeal:
    @pytest.mark.asyncio
    async def test_creator_can_delete_any_meal(self, meal_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_meal_row(user_id="u_other"),  # _can_modify_meal → meal lookup
            {"role": "creator"},  # _get_user_group_role
        ]

        result = await meal_service.delete_meal("ml_test01", "u_creator")

        assert "deleted" in result["message"].lower()
        assert mock_db.execute.await_count == 1

    @pytest.mark.asyncio
    async def test_member_can_only_delete_own_meal(self, meal_service, mock_db):
        # Arrange: meal belongs to a different user
        mock_db.read_one.side_effect = [
            _make_meal_row(user_id="u_other"),
            {"role": "member"},
        ]

        with pytest.raises(HTTPException) as exc:
            await meal_service.delete_meal("ml_test01", "u_member")
        assert exc.value.status_code == 403
        assert mock_db.execute.await_count == 0

    @pytest.mark.asyncio
    async def test_member_can_delete_own_meal(self, meal_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_meal_row(user_id="u_member"),
            {"role": "member"},
        ]

        result = await meal_service.delete_meal("ml_test01", "u_member")

        assert "deleted" in result["message"].lower()
        assert mock_db.execute.await_count == 1


# ================================================================
# get_meal_statistics (input validation only)
# ================================================================


class TestGetMealStatisticsValidation:
    @pytest.mark.asyncio
    async def test_missing_date_range_returns_400(self, meal_service):
        with pytest.raises(HTTPException) as exc:
            await meal_service.get_meal_statistics(MealQueryFilters(pet_id="p_test01"), "u_test01")
        assert exc.value.status_code == 400


# ================================================================
# update_meal (permission only — full recalculation tested via create)
# ================================================================


class TestUpdateMeal:
    @pytest.mark.asyncio
    async def test_member_cannot_update_meal_owned_by_another(self, meal_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_meal_row(user_id="u_other"),  # _can_modify_meal → meal lookup
            {"role": "member"},
        ]

        with pytest.raises(HTTPException) as exc:
            await meal_service.update_meal("ml_test01", UpdateMealRequest(notes="hi"), "u_member")
        assert exc.value.status_code == 403
        assert mock_db.execute.await_count == 0


# ================================================================
# get_today_meals — local_date validation
# ================================================================


class TestGetTodayMealsLocalDate:
    @pytest.mark.asyncio
    async def test_invalid_local_date_raises_400(self, meal_service, mock_db):
        filters = MealQueryFilters(pet_id="p_test01")
        with pytest.raises(HTTPException) as exc:
            await meal_service.get_today_meals(filters, "u_test01", local_date="invalid")
        assert exc.value.status_code == 400
        assert "YYYY-MM-DD" in exc.value.detail

    @pytest.mark.asyncio
    async def test_valid_local_date_used_as_today(self, meal_service, mock_db):
        # get_meals path: _get_pet_group_context + _can_view_meals
        # then get_today_meals: _get_pet_group_context again + pet calorie target
        mock_db.read_one.side_effect = [
            _make_pet_context(),  # get_meals → _get_pet_group_context
            {"role": "member"},  # get_meals → _can_view_meals
            _make_pet_context(),  # get_today_meals → _get_pet_group_context
            {"daily_calorie_target": 300},  # get_today_meals → pet calorie query
        ]
        mock_db.read.return_value = []

        result = await meal_service.get_today_meals(
            MealQueryFilters(pet_id="p_test01"), "u_test01", local_date="2026-04-09"
        )
        assert result.date == "2026-04-09"

    @pytest.mark.asyncio
    async def test_no_local_date_falls_back_to_utc(self, meal_service, mock_db):
        mock_db.read_one.side_effect = [
            _make_pet_context(),
            {"role": "member"},
            _make_pet_context(),
            {"daily_calorie_target": None},
        ]
        mock_db.read.return_value = []

        result = await meal_service.get_today_meals(MealQueryFilters(pet_id="p_test01"), "u_test01")
        expected = dt.now(tz.utc).strftime("%Y-%m-%d")
        assert result.date == expected
