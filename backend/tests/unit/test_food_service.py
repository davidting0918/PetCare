"""
Unit tests for ``backend.services.food_service.FoodService``.

These tests follow the unit-tier rules:

* No FastAPI app import — only ``FoodService`` is imported.
* No real Postgres — ``get_db`` is patched to return an ``AsyncMock``.
* No real filesystem — ``get_photo_storage_path`` is patched.
* Each test gets its own fresh mocks via fixtures (parallel-safe).

Authorization coverage is the priority — every method gates on
``creator`` / ``member`` / ``viewer`` and each gate has its own test.
"""

from datetime import datetime as dt
from datetime import timezone as tz
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from backend.models.food import CreateFoodRequest, FoodType, TargetPet, UpdateFoodRequest

# ================================================================
# Helpers
# ================================================================


def _make_food_row(**overrides):
    base = {
        "id": "f_test01",
        "creator_id": "u_creator",
        "group_id": "grp_test01",
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
        "photo_url": "",
        "created_at": dt(2026, 4, 8, tzinfo=tz.utc),
        "updated_at": dt(2026, 4, 8, tzinfo=tz.utc),
        "is_active": True,
        "group_name": "Test Group",
        "creator_name": "Creator User",
    }
    base.update(overrides)
    return base


def _make_user_stub(user_id="u_test01", name="Test User"):
    return SimpleNamespace(id=user_id, name=name)


def _valid_create_request(**overrides):
    base = dict(
        brand="Acme",
        product_name="Premium Cat",
        food_type=FoodType.DRY_FOOD,
        target_pet=TargetPet.CAT,
        unit_weight=100.0,
        calories=350.0,
        protein=30.0,
        fat=15.0,
        moisture=10.0,
        carbohydrate=40.0,
    )
    base.update(overrides)
    return CreateFoodRequest(**base)


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
def food_service(monkeypatch, mock_db):
    monkeypatch.setattr("backend.services.food_service.get_db", lambda: mock_db)
    monkeypatch.setattr(
        "backend.services.food_service.get_photo_storage_path",
        lambda category: "/fake/storage/path",
    )
    from backend.services.food_service import FoodService

    return FoodService()


# ================================================================
# create_food
# ================================================================


class TestCreateFood:
    @pytest.mark.asyncio
    async def test_member_can_create_food(self, food_service, mock_db):
        # Arrange: user is a member of the group
        mock_db.read_one.side_effect = [
            {"role": "member"},  # _can_manage_food → role lookup
            {"id": "grp_test01", "name": "Test Group"},  # group lookup for response
        ]

        # Act
        result = await food_service.create_food(
            "grp_test01", _valid_create_request(), _make_user_stub("u_member", "Member")
        )

        # Assert: insert was called against foods table
        assert mock_db.insert_one.await_count == 1
        assert mock_db.insert_one.await_args.args[0] == "foods"
        # Assert: response carries calculated calories_per_unit (350 * 100 / 100 = 350)
        assert result.calories_per_unit == 350.0
        assert result.creator_id == "u_member"

    @pytest.mark.asyncio
    async def test_viewer_cannot_create_food(self, food_service, mock_db):
        mock_db.read_one.return_value = {"role": "viewer"}

        with pytest.raises(HTTPException) as exc:
            await food_service.create_food("grp_test01", _valid_create_request(), _make_user_stub())
        assert exc.value.status_code == 403
        assert mock_db.insert_one.await_count == 0

    @pytest.mark.asyncio
    async def test_non_member_cannot_create_food(self, food_service, mock_db):
        mock_db.read_one.return_value = None  # _get_user_group_role → no role

        with pytest.raises(HTTPException) as exc:
            await food_service.create_food("grp_test01", _valid_create_request(), _make_user_stub())
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_rejects_excessive_nutritional_percentages(self, food_service, mock_db):
        # Arrange: 50 + 30 + 20 + 10 = 110 > 105 tolerance
        mock_db.read_one.return_value = {"role": "creator"}
        bad_request = _valid_create_request(protein=50.0, fat=30.0, moisture=20.0, carbohydrate=10.0)

        with pytest.raises(HTTPException) as exc:
            await food_service.create_food("grp_test01", bad_request, _make_user_stub())
        assert exc.value.status_code == 400
        assert "100%" in exc.value.detail
        assert mock_db.insert_one.await_count == 0


# ================================================================
# get_group_foods
# ================================================================


class TestGetGroupFoods:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("role", ["creator", "member", "viewer"])
    async def test_all_roles_can_view_group_foods(self, food_service, mock_db, role):
        mock_db.read_one.return_value = {"role": role}
        mock_db.read.return_value = [_make_food_row(brand="Brand A"), _make_food_row(brand="Brand B")]

        result = await food_service.get_group_foods("grp_test01", "u_test01")

        assert len(result) == 2
        # Sorted alphabetically by brand
        assert result[0].brand == "Brand A"
        assert result[1].brand == "Brand B"

    @pytest.mark.asyncio
    async def test_non_member_cannot_view_group_foods(self, food_service, mock_db):
        mock_db.read_one.return_value = None

        with pytest.raises(HTTPException) as exc:
            await food_service.get_group_foods("grp_test01", "u_outsider")
        assert exc.value.status_code == 403


# ================================================================
# get_food_details
# ================================================================


class TestGetFoodDetails:
    @pytest.mark.asyncio
    async def test_member_can_view_food_details(self, food_service, mock_db):
        mock_db.read_one.side_effect = [
            {"group_id": "grp_test01"},  # _get_user_food_role → food lookup
            {"role": "member"},  # _get_user_food_role → role lookup
            _make_food_row(),  # final detail fetch
        ]

        result = await food_service.get_food_details("f_test01", "u_member")

        assert result.id == "f_test01"
        # Assert: calories_per_unit was calculated (350 * 100 / 100)
        assert result.calories_per_unit == 350.0

    @pytest.mark.asyncio
    async def test_food_not_found_raises_404_in_role_check(self, food_service, mock_db):
        mock_db.read_one.return_value = None  # _get_user_food_role → food lookup

        with pytest.raises(HTTPException) as exc:
            await food_service.get_food_details("f_ghost", "u_test01")
        assert exc.value.status_code == 404


# ================================================================
# update_food
# ================================================================


class TestUpdateFood:
    @pytest.mark.asyncio
    async def test_member_can_update_food(self, food_service, mock_db):
        mock_db.read_one.side_effect = [
            {"group_id": "grp_test01"},  # _can_manage_food → food lookup
            {"role": "member"},  # _can_manage_food → role lookup
            {"group_id": "grp_test01"},  # get_food_details → food lookup
            {"role": "member"},  # get_food_details → role lookup
            _make_food_row(brand="Updated Brand"),  # final fetch
        ]

        result = await food_service.update_food("f_test01", UpdateFoodRequest(brand="Updated Brand"), "u_member")

        assert mock_db.execute.await_count == 1
        update_query = mock_db.execute.await_args.args[0]
        assert "UPDATE foods" in update_query
        assert result.brand == "Updated Brand"

    @pytest.mark.asyncio
    async def test_viewer_cannot_update_food(self, food_service, mock_db):
        mock_db.read_one.side_effect = [
            {"group_id": "grp_test01"},
            {"role": "viewer"},
        ]

        with pytest.raises(HTTPException) as exc:
            await food_service.update_food("f_test01", UpdateFoodRequest(brand="Hacked"), "u_viewer")
        assert exc.value.status_code == 403
        assert mock_db.execute.await_count == 0


# ================================================================
# delete_food
# ================================================================


class TestDeleteFood:
    @pytest.mark.asyncio
    async def test_creator_can_delete_food(self, food_service, mock_db):
        mock_db.read_one.side_effect = [
            {"group_id": "grp_test01"},
            {"role": "creator"},
        ]

        result = await food_service.delete_food("f_test01", "u_creator")

        assert mock_db.execute.await_count == 1
        assert "delete from foods" in mock_db.execute.await_args.args[0].lower()
        assert "deleted" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_viewer_cannot_delete_food(self, food_service, mock_db):
        mock_db.read_one.side_effect = [
            {"group_id": "grp_test01"},
            {"role": "viewer"},
        ]

        with pytest.raises(HTTPException) as exc:
            await food_service.delete_food("f_test01", "u_viewer")
        assert exc.value.status_code == 403
        assert mock_db.execute.await_count == 0


# ================================================================
# search_foods
# ================================================================


class TestSearchFoods:
    @pytest.mark.asyncio
    async def test_member_can_search_with_keyword(self, food_service, mock_db):
        mock_db.read_one.side_effect = [
            {"role": "member"},  # _can_view_food → role lookup
            {"name": "Test Group"},  # group name lookup
        ]
        mock_db.read.return_value = [_make_food_row(brand="Acme", product_name="Premium Cat")]

        result = await food_service.search_foods("grp_test01", "u_member", keyword="acme")

        assert len(result) == 1
        assert result[0].brand == "Acme"

    @pytest.mark.asyncio
    async def test_non_member_cannot_search(self, food_service, mock_db):
        mock_db.read_one.return_value = None

        with pytest.raises(HTTPException) as exc:
            await food_service.search_foods("grp_test01", "u_outsider", keyword="acme")
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_search_without_keyword_returns_all(self, food_service, mock_db):
        mock_db.read_one.side_effect = [
            {"role": "viewer"},
            {"name": "Test Group"},
        ]
        mock_db.read.return_value = [
            _make_food_row(brand="Zen Brand"),
            _make_food_row(brand="Acme Brand"),
        ]

        result = await food_service.search_foods("grp_test01", "u_viewer", keyword=None)

        assert len(result) == 2
        # Assert: alphabetical sort when no keyword
        assert result[0].brand == "Acme Brand"
        assert result[1].brand == "Zen Brand"
